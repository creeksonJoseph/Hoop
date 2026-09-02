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
    await conn.execute("""
        INSERT INTO connected_ig_accounts
            (user_id, ig_username, zernio_account_id, zernio_api_key_enc)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, ig_username) DO UPDATE SET
            zernio_account_id  = EXCLUDED.zernio_account_id,
            zernio_api_key_enc = EXCLUDED.zernio_api_key_enc
    """, user_id, ig_username.lower().strip(), zernio_account_id, zernio_api_key_enc)


async def list_dm_usernames_with_session_counts(
    conn: asyncpg.Connection, user_id: int
) -> List[asyncpg.Record]:
    return await conn.fetch("""
        SELECT a.ig_username, a.last_message,
               COUNT(s.id) AS session_count
        FROM connected_ig_accounts a
        LEFT JOIN wingman_sessions s
            ON s.ig_username = a.ig_username AND s.user_id = a.user_id
        WHERE a.user_id = $1
        GROUP BY a.ig_username, a.last_message, a.added_at
        ORDER BY a.added_at DESC
    """, user_id)


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

