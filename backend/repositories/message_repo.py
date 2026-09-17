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
from typing import List, Optional

import asyncpg



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
    """Insert a single message row. Silently ignores duplicate IDs."""
    await conn.execute(
        """
        INSERT INTO messages
            (id, conversation_id, sender_id, sender_name, message, direction, created_at, platform, account_username)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
            account_username = COALESCE(EXCLUDED.account_username, messages.account_username)
        """,
        str(msg_id), str(conversation_id), sender_id, sender_name,
        message, direction, created_at, platform, account_username,
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
        sender = msg.get("sender") or {}
        raw_ts = msg.get("sentAt") or msg.get("createdAt") or msg.get("created_at") or msg.get("timestamp")
        if isinstance(raw_ts, (int, float)):
            ts_sec = raw_ts / 1000 if raw_ts > 1e10 else raw_ts
            parsed_ts = datetime.datetime.fromtimestamp(ts_sec, tz=datetime.timezone.utc).isoformat().replace("+00:00", "Z")
        elif raw_ts is not None:
            parsed_ts = str(raw_ts)
        else:
            parsed_ts = None

        await upsert_message(
            conn,
            msg_id=str(msg.get("id") or msg.get("message_id")),
            conversation_id=conversation_id,
            sender_id=sender.get("id") or msg.get("senderId"),
            sender_name=sender.get("name") or sender.get("username") or msg.get("senderName"),
            message=msg.get("text") or msg.get("message"),
            direction=msg.get("direction"),
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



