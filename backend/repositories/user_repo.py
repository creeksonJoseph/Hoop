"""
repositories/user_repo.py
=========================
LAYER: Repository - raw DB operations for the users table.
No business logic. No Zernio calls. Only asyncpg.
"""
from typing import Optional
import asyncpg


async def get_user_by_email(conn: asyncpg.Connection, email: str) -> Optional[asyncpg.Record]:
    return await conn.fetchrow("SELECT * FROM users WHERE email = $1", email.lower().strip())


async def get_user_by_id(conn: asyncpg.Connection, user_id: int) -> Optional[asyncpg.Record]:
    return await conn.fetchrow("SELECT id, email FROM users WHERE id = $1", user_id)


async def create_user(conn: asyncpg.Connection, email: str, password_hash: str) -> asyncpg.Record:
    return await conn.fetchrow(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
        email.lower().strip(), password_hash,
    )


async def get_or_create_google_user(conn: asyncpg.Connection, email: str, default_password_hash: str) -> asyncpg.Record:
    normalized = email.lower().strip()
    user = await get_user_by_email(conn, normalized)
    if user:
        return user
    return await create_user(conn, normalized, default_password_hash)


async def update_user_password(conn: asyncpg.Connection, user_id: int, password_hash: str) -> None:
    await conn.execute(
        "UPDATE users SET password_hash = $1 WHERE id = $2",
        password_hash, user_id,
    )
