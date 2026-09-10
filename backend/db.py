"""
db.py — Database pool management & schema initialization
=========================================================
LAYER: Schema/DB (bottom of the stack)
- get_pool(): returns the shared asyncpg connection pool
- init_db(): creates all tables and seeds the admin account
"""

import os
import secrets
from typing import Optional

import asyncpg
from passlib.context import CryptContext

from config import (
    DATABASE_URL,
    APP_MASTER_KEY,
)
from crypto import encrypt_api_key

_pool: Optional[asyncpg.Pool] = None
_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        # statement_cache_size=0 is required for Supabase Transaction Pooler
        # (PgBouncer in transaction mode does not support prepared statements)
        _pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=1,
            max_size=5,
            statement_cache_size=0,
        )
    return _pool



async def init_db():
    """Verify DB connectivity on startup. Schema is managed via supabase_schema.sql."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.fetchval("SELECT 1")



