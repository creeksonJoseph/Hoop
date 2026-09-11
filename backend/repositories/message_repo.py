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
