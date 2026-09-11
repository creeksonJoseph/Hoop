"""
repositories/session_repo.py
==============================
LAYER: Repository — raw DB operations for wingman_sessions.
"""
from typing import List, Optional

import asyncpg


async def get_sessions_for_ig(
    conn: asyncpg.Connection, user_id: int, ig_username: str
) -> List[asyncpg.Record]:
    return await conn.fetch(
        "SELECT * FROM wingman_sessions WHERE user_id = $1 AND ig_username = $2 ORDER BY created_at DESC",
        user_id, ig_username,
    )


async def get_all_sessions_for_user(
    conn: asyncpg.Connection, user_id: int
) -> List[asyncpg.Record]:
    return await conn.fetch(
        "SELECT * FROM wingman_sessions WHERE user_id = $1 ORDER BY wingman_name ASC, created_at DESC",
        user_id,
    )


async def get_session_by_token(conn: asyncpg.Connection, token: str) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(
        "SELECT * FROM wingman_sessions WHERE token = $1", token
    )


async def get_session_by_id(
    conn: asyncpg.Connection, session_id: str, user_id: int
) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(
        "SELECT * FROM wingman_sessions WHERE id = $1 AND user_id = $2",
        session_id, user_id,
    )


async def get_active_tokens_for_ig(conn: asyncpg.Connection, ig_username: str) -> List[str]:
    rows = await conn.fetch(
        "SELECT token FROM wingman_sessions WHERE ig_username = $1 AND access_level != 'revoked'",
        ig_username,
    )
    return [r["token"] for r in rows]


async def create_session(
    conn: asyncpg.Connection,
    session_id: str,
    user_id: int,
    ig_username: str,
    wingman_name: str,
    token: str,
    access_level: str,
) -> None:
    await conn.execute("""
        INSERT INTO wingman_sessions (id, user_id, ig_username, wingman_name, token, access_level)
        VALUES ($1, $2, $3, $4, $5, $6)
    """, session_id, user_id, ig_username, wingman_name, token, access_level)


async def update_session_access(
    conn: asyncpg.Connection, session_id: str, user_id: int, access_level: str
) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(
        "UPDATE wingman_sessions SET access_level = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
        access_level, session_id, user_id,
    )


async def upsert_session_token(
    conn: asyncpg.Connection, token: str, access_level: str
) -> None:
    """If a session with this token already exists, just update the access level."""
    await conn.execute(
        "UPDATE wingman_sessions SET access_level = $1, created_at = NOW() WHERE token = $2",
        access_level, token,
    )


async def session_token_exists(conn: asyncpg.Connection, token: str) -> bool:
    row = await conn.fetchrow("SELECT id FROM wingman_sessions WHERE token = $1", token)
    return row is not None


async def delete_session(
    conn: asyncpg.Connection, session_id: str, user_id: int
) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(
        "DELETE FROM wingman_sessions WHERE id = $1 AND user_id = $2 RETURNING token",
        session_id, user_id,
    )


async def delete_all_sessions_for_ig(
    conn: asyncpg.Connection, user_id: int, ig_username: str
) -> List[str]:
    """Deletes all wingman sessions for this ig_username & user_id, returning list of revoked tokens."""
    rows = await conn.fetch(
        "DELETE FROM wingman_sessions WHERE user_id = $1 AND ig_username = $2 RETURNING token",
        user_id, ig_username.lower().strip(),
    )
    return [r["token"] for r in rows]

