"""
repositories/message_repo.py
==============================
LAYER: Repository — raw DB operations for the messages table.
No business logic. No Zernio calls. Only asyncpg.
"""
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
) -> None:
    """Insert a single message row. Silently ignores duplicate IDs."""
    await conn.execute(
        """
        INSERT INTO messages
            (id, conversation_id, sender_id, sender_name, message, direction, created_at, platform)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
        """,
        str(msg_id), str(conversation_id), sender_id, sender_name,
        message, direction, created_at, platform,
    )


async def upsert_messages_batch(
    conn: asyncpg.Connection,
    messages: List[dict],
    conversation_id: str,
    platform: str = "instagram",
) -> None:
    """
    Bulk-upsert a list of raw Zernio message dicts into the messages table.
    Each dict is expected to have the shape returned by zernio_service.get_messages().
    """
    for msg in messages:
        sender = msg.get("sender") or {}
        raw_ts = msg.get("sentAt") or msg.get("createdAt")
        if isinstance(raw_ts, (int, float)):
            ts_sec = raw_ts / 1000 if raw_ts > 1e10 else raw_ts
            parsed_ts = str(int(ts_sec))
        elif raw_ts is not None:
            parsed_ts = str(raw_ts)
        else:
            parsed_ts = None

        await upsert_message(
            conn,
            msg_id=msg["id"],
            conversation_id=conversation_id,
            sender_id=sender.get("id") or msg.get("senderId"),
            sender_name=sender.get("name") or sender.get("username") or msg.get("senderName"),
            message=msg.get("text") or msg.get("message"),
            direction=msg.get("direction"),
            created_at=parsed_ts,
            platform=platform,
        )


async def get_conversation_by_participant(
    conn: asyncpg.Connection, participant_username: str
) -> Optional[asyncpg.Record]:
    clean = participant_username.lower().strip().lstrip("@")
    return await conn.fetchrow(
        "SELECT * FROM conversations WHERE LOWER(participant_username) = $1 LIMIT 1",
        clean,
    )


async def upsert_conversation(
    conn: asyncpg.Connection,
    conversation_id: str,
    participant_username: str,
    participant_name: Optional[str] = None,
) -> None:
    clean = participant_username.lower().strip().lstrip("@")
    await conn.execute(
        """
        INSERT INTO conversations (conversation_id, participant_username, participant_name, fetched_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (conversation_id) DO UPDATE SET
            participant_username = EXCLUDED.participant_username,
            participant_name     = COALESCE(EXCLUDED.participant_name, conversations.participant_name),
            fetched_at           = NOW()
        """,
        str(conversation_id), clean, participant_name
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
    conn: asyncpg.Connection, participant_username: str
) -> List[asyncpg.Record]:
    clean = participant_username.lower().strip().lstrip("@")
    conv = await get_conversation_by_participant(conn, clean)
    if conv and conv.get("conversation_id"):
        msgs = await get_messages_by_conversation_id(conn, conv["conversation_id"])
        if msgs:
            return msgs

    return await conn.fetch(
        """
        SELECT * FROM messages
        WHERE LOWER(sender_name) = $1
           OR conversation_id = $1
        ORDER BY created_at ASC
        """,
        clean
    )

