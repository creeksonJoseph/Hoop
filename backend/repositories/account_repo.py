"""
repositories/account_repo.py
=============================
LAYER: Repository — raw DB operations for connected_ig_accounts.
Keys stored here are ALWAYS encrypted (zernio_api_key_enc).
No decryption happens here — that's the Service layer's job.
"""
from typing import List, Optional

import asyncpg


async def get_accounts_for_user(conn: asyncpg.Connection, user_id: int) -> List[asyncpg.Record]:
    return await conn.fetch(
        "SELECT * FROM connected_ig_accounts WHERE user_id = $1 ORDER BY added_at ASC",
        user_id,
    )


async def get_account(
    conn: asyncpg.Connection, user_id: int, ig_username: str
) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(
        "SELECT * FROM connected_ig_accounts WHERE user_id = $1 AND ig_username = $2",
        user_id, ig_username.lower().strip(),
    )


async def get_any_account_for_user(conn: asyncpg.Connection, user_id: int) -> Optional[asyncpg.Record]:
    """Returns the first linked account (used when ig_username is not yet specified)."""
    return await conn.fetchrow(
        "SELECT * FROM connected_ig_accounts WHERE user_id = $1 LIMIT 1", user_id
    )


async def get_account_by_ig(conn: asyncpg.Connection, ig_username: str) -> Optional[asyncpg.Record]:
    """Cross-user lookup by ig_username (used by wingman routes)."""
    return await conn.fetchrow(
        "SELECT * FROM connected_ig_accounts WHERE ig_username = $1 LIMIT 1",
        ig_username.lower().strip(),
    )


async def upsert_account(
    conn: asyncpg.Connection,
    user_id: int,
    ig_username: str,
    zernio_account_id: str,
    zernio_api_key_enc: str,
) -> None:
    clean_username = ig_username.lower().strip()
    await conn.execute("""
        INSERT INTO connected_ig_accounts
            (user_id, ig_username, zernio_account_id, zernio_api_key_enc)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, ig_username) DO UPDATE SET
            zernio_account_id  = EXCLUDED.zernio_account_id,
            zernio_api_key_enc = EXCLUDED.zernio_api_key_enc
    """, user_id, clean_username, zernio_account_id, zernio_api_key_enc)

    if clean_username != "__pending__":
        await conn.execute(
            "DELETE FROM connected_ig_accounts WHERE user_id = $1 AND ig_username = '__pending__'",
            user_id,
        )



async def add_tracked_dm(conn: asyncpg.Connection, user_id: int, ig_username: str) -> None:
    await conn.execute("""
        INSERT INTO tracked_dms (user_id, ig_username)
        VALUES ($1, $2)
        ON CONFLICT (user_id, ig_username) DO NOTHING
    """, user_id, ig_username.lower().strip())


async def delete_tracked_dm(conn: asyncpg.Connection, user_id: int, ig_username: str) -> None:
    clean_user = ig_username.lower().strip().lstrip("@")
    await conn.execute(
        "DELETE FROM tracked_dms WHERE user_id = $1 AND LOWER(ig_username) = $2",
        user_id, clean_user,
    )
    await conn.execute(
        "DELETE FROM conversations WHERE LOWER(participant_username) = $1",
        clean_user,
    )




async def list_dm_usernames_with_session_counts(
    conn: asyncpg.Connection, user_id: int
) -> List[asyncpg.Record]:
    return await conn.fetch("""
        SELECT t.ig_username, t.last_message, c.participant_name, c.profile_pic_url,
               COUNT(s.id) AS session_count
        FROM tracked_dms t
        LEFT JOIN conversations c
            ON LOWER(c.participant_username) = LOWER(t.ig_username)
        LEFT JOIN wingman_sessions s
            ON s.ig_username = t.ig_username AND s.user_id = t.user_id
        WHERE t.user_id = $1
        GROUP BY t.ig_username, t.last_message, t.added_at, c.participant_name, c.profile_pic_url
        ORDER BY t.added_at DESC
    """, user_id)


async def is_own_connected_account(conn: asyncpg.Connection, user_id: int, ig_username: str) -> bool:
    row = await conn.fetchrow(
        "SELECT 1 FROM connected_ig_accounts WHERE user_id = $1 AND ig_username = $2",
        user_id, ig_username.lower().strip(),
    )
    return row is not None


async def count_accounts_for_user(conn: asyncpg.Connection, user_id: int) -> int:
    return await conn.fetchval(
        "SELECT COUNT(*) FROM connected_ig_accounts WHERE user_id = $1", user_id
    )


async def delete_account(conn: asyncpg.Connection, user_id: int, ig_username: str) -> None:
    await conn.execute(
        "DELETE FROM connected_ig_accounts WHERE user_id = $1 AND ig_username = $2",
        user_id, ig_username.lower().strip(),
    )
    await conn.execute(
        "DELETE FROM conversations WHERE participant_username = $1",
        ig_username.lower().strip(),
    )


