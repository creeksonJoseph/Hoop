"""
repositories/user_repo.py
=========================
LAYER: Repository — raw DB operations for the users table.
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
