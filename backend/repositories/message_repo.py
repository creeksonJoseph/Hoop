"""
repositories/message_repo.py
==============================
LAYER: Repository - raw DB operations for the messages table.
No business logic. No Zernio calls. Only asyncpg.

ACCOUNT ISOLATION:
  All conversation and message queries are scoped by account_username
  (the connected Instagram account that owns this conversation thread).
  This prevents cross-account data contamination when a user has
  multiple connected Instagram accounts.
"""
import datetime
import re
from typing import List, Optional

import asyncpg


_DUPLICATE_WINDOW_SECONDS = 2


def _normalize_message(value: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).casefold()


def _parse_created_at(value: Optional[str]) -> Optional[datetime.datetime]:
    if not value:
        return None
    if isinstance(value, datetime.datetime):
        return value
    if isinstance(value, (int, float)):
        ts_sec = value / 1000.0 if value > 1e10 else float(value)
        return datetime.datetime.fromtimestamp(ts_sec, tz=datetime.timezone.utc)
    val_str = str(value).strip()
    if val_str.isdigit():
        try:
            val_num = float(val_str)
            ts_sec = val_num / 1000.0 if val_num > 1e10 else val_num
            return datetime.datetime.fromtimestamp(ts_sec, tz=datetime.timezone.utc)
        except (ValueError, OverflowError):
            return None
    try:
        return datetime.datetime.fromisoformat(val_str.replace("Z", "+00:00"))
    except ValueError:
        return None


async def _is_recent_duplicate(
    conn: asyncpg.Connection,
    *,
    msg_id: str,
    conversation_id: str,
    message: Optional[str],
    direction: Optional[str],
    created_at: Optional[str],
) -> bool:
    timestamp = _parse_created_at(created_at)
    if timestamp is None:
        return False

    candidates = await conn.fetch(
        """
        SELECT message, created_at
        FROM messages
        WHERE conversation_id = $1
          AND direction IS NOT DISTINCT FROM $2
          AND id <> $3
        ORDER BY created_at DESC
        LIMIT 20
        """,
        str(conversation_id), direction, str(msg_id),
    )
    normalized = _normalize_message(message)
    for row in candidates:
        if _normalize_message(row["message"]) == normalized:
            cand_ts = _parse_created_at(row["created_at"])
            if cand_ts and abs((timestamp - cand_ts).total_seconds()) <= _DUPLICATE_WINDOW_SECONDS:
                return True
    return False


async def upsert_message(
    conn: asyncpg.Connection,
    *,
    msg_id: str,
    conversation_id: str,
    sender_id: Optional[str],
    sender_name: Optional[str],
    message: Optional[str],
    direction: Optional[str],
    created_at: Optional[str],
    platform: str = "instagram",
    account_username: str = "",
) -> None:
    """Insert a message once, updating existing values on conflict."""
    if not msg_id or str(msg_id).startswith("sent_"):
        return

    # Ensure created_at is valid ISO timestamp if provided
    dt = _parse_created_at(created_at)
    formatted_ts = dt.isoformat().replace("+00:00", "Z") if dt else created_at

    if await _is_recent_duplicate(
        conn,
        msg_id=str(msg_id),
        conversation_id=str(conversation_id),
        message=message,
        direction=direction,
        created_at=formatted_ts,
    ):
        return

    await conn.execute(
        """
        INSERT INTO messages
            (id, conversation_id, sender_id, sender_name, message, direction, created_at, platform, account_username)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
            conversation_id  = EXCLUDED.conversation_id,
            sender_id        = COALESCE(EXCLUDED.sender_id, messages.sender_id),
            sender_name      = COALESCE(EXCLUDED.sender_name, messages.sender_name),
            message          = COALESCE(EXCLUDED.message, messages.message),
            direction        = COALESCE(EXCLUDED.direction, messages.direction),
            created_at       = COALESCE(EXCLUDED.created_at, messages.created_at),
            account_username = COALESCE(NULLIF(EXCLUDED.account_username, ''), messages.account_username)
        """,
        str(msg_id), str(conversation_id), sender_id, sender_name,
        message, direction, formatted_ts, platform, account_username,
    )


async def upsert_messages_batch(
    conn: asyncpg.Connection,
    messages: List[dict],
    conversation_id: str,
    platform: str = "instagram",
    account_username: str = "",
) -> None:
    """
    Bulk-upsert a list of raw Zernio message dicts into the messages table.
    Each dict is expected to have the shape returned by zernio_service.get_messages().
    """
    for msg in messages:
        if not isinstance(msg, dict):
            continue
        msg_id = msg.get("id") or msg.get("message_id")
        if not msg_id:
            continue

        sender = msg.get("sender") or {}
        raw_ts = msg.get("sentAt") or msg.get("createdAt") or msg.get("created_at") or msg.get("timestamp")
        dt = _parse_created_at(raw_ts)
        parsed_ts = dt.isoformat().replace("+00:00", "Z") if dt else datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")

        raw_dir = str(msg.get("direction") or "").lower()
        is_from_me = bool(msg.get("isFromMe") or msg.get("is_from_me") or msg.get("fromMe"))
        if raw_dir in ("outbound", "outgoing", "sent", "echo") or is_from_me:
            direction = "outgoing"
        elif raw_dir in ("inbound", "incoming", "received"):
            direction = "incoming"
        else:
            direction = "outgoing" if is_from_me else "incoming"

        await upsert_message(
            conn,
            msg_id=str(msg_id),
            conversation_id=conversation_id,
            sender_id=sender.get("id") or msg.get("senderId"),
            sender_name=sender.get("name") or sender.get("username") or msg.get("senderName"),
            message=msg.get("text") or msg.get("message"),
            direction=direction,
            created_at=parsed_ts,
            platform=platform,
            account_username=account_username,
        )



async def get_conversation_by_participant(
    conn: asyncpg.Connection,
    participant_username: str,
    account_username: str = "",
) -> Optional[asyncpg.Record]:
    """
    Fetch the conversation row for a given participant, scoped to a specific
    connected Instagram account. When account_username is provided, only
    conversations belonging to that account are returned - preventing cross-
    account contamination.
    """
    clean = participant_username.lower().strip().lstrip("@")
    clean_account = account_username.lower().strip() if account_username else ""
    if clean_account:
        return await conn.fetchrow(
            """
            SELECT * FROM conversations
            WHERE LOWER(participant_username) = $1
              AND LOWER(account_username) = $2
            LIMIT 1
            """,
            clean, clean_account,
        )
    # Fallback (e.g. wingman public route that doesn't know account): try any match
    return await conn.fetchrow(
        "SELECT * FROM conversations WHERE LOWER(participant_username) = $1 LIMIT 1",
        clean,
    )


async def upsert_conversation(
    conn: asyncpg.Connection,
    conversation_id: str,
    participant_username: str,
    participant_name: Optional[str] = None,
    profile_pic_url: Optional[str] = None,
    account_username: str = "",
) -> None:
    clean = participant_username.lower().strip().lstrip("@")
    clean_account = account_username.lower().strip()
    await conn.execute(
        """
        INSERT INTO conversations
            (conversation_id, participant_username, participant_name, profile_pic_url, fetched_at, account_username)
        VALUES ($1, $2, $3, $4, NOW(), $5)
        ON CONFLICT (conversation_id) DO UPDATE SET
            participant_username = EXCLUDED.participant_username,
            participant_name     = COALESCE(EXCLUDED.participant_name, conversations.participant_name),
            profile_pic_url      = COALESCE(EXCLUDED.profile_pic_url, conversations.profile_pic_url),
            fetched_at           = NOW(),
            account_username     = COALESCE(NULLIF(EXCLUDED.account_username, ''), conversations.account_username)
        """,
        str(conversation_id), clean, participant_name, profile_pic_url, clean_account,
    )


async def get_messages_by_conversation_id(
    conn: asyncpg.Connection, conversation_id: str
) -> List[asyncpg.Record]:
    return await conn.fetch(
        """
        SELECT * FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
        """,
        str(conversation_id)
    )


async def get_messages_for_participant(
    conn: asyncpg.Connection,
    participant_username: str,
    account_username: str = "",
) -> List[asyncpg.Record]:
    clean = participant_username.lower().strip().lstrip("@")
    conv = await get_conversation_by_participant(conn, clean, account_username)
    if conv and conv.get("conversation_id"):
        msgs = await get_messages_by_conversation_id(conn, conv["conversation_id"])
        if msgs:
            return msgs

    # Fallback: match by sender_name scoped to account where possible
    if account_username:
        return await conn.fetch(
            """
            SELECT * FROM messages
            WHERE (LOWER(sender_name) = $1 OR conversation_id = $1)
              AND (account_username = '' OR LOWER(account_username) = $2)
            ORDER BY created_at ASC
            """,
            clean, account_username.lower().strip(),
        )
    return await conn.fetch(
        """
        SELECT * FROM messages
        WHERE LOWER(sender_name) = $1
           OR conversation_id = $1
        ORDER BY created_at ASC
        """,
        clean
    )


async def delete_messages_and_conversation(
    conn: asyncpg.Connection,
    participant_username: str,
    account_username: str = "",
) -> None:
    """
    Deletes all messages and conversation records associated with a participant handle,
    scoped to a specific connected Instagram account so that deleting a DM from one
    account doesn't affect the same participant's thread on another account.
    """
    clean = participant_username.lower().strip().lstrip("@")
    clean_account = account_username.lower().strip()

    if clean_account:
        # Delete messages in conversations owned by this account
        await conn.execute(
            """
            DELETE FROM messages
            WHERE conversation_id IN (
                SELECT conversation_id FROM conversations
                WHERE LOWER(participant_username) = $1
                  AND LOWER(account_username) = $2
            )
            """,
            clean, clean_account,
        )
        await conn.execute(
            """
            DELETE FROM conversations
            WHERE LOWER(participant_username) = $1
              AND LOWER(account_username) = $2
            """,
            clean, clean_account,
        )
    else:
        # Fallback: delete all (used only when account_username is unknown)
        await conn.execute(
            """
            DELETE FROM messages
            WHERE conversation_id IN (
                SELECT conversation_id FROM conversations WHERE LOWER(participant_username) = $1
            )
            OR LOWER(sender_name) = $1
            OR conversation_id = $1
            """,
            clean,
        )
        await conn.execute(
            "DELETE FROM conversations WHERE LOWER(participant_username) = $1",
            clean,
        )



