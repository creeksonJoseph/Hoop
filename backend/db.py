"""
db.py - Database pool management & schema initialization
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
    """Verify DB connectivity and apply additive account-scoping migrations."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.fetchval("SELECT 1")

        # ── tracked_dms: add account_username if missing ──────────────────────
        await conn.execute("ALTER TABLE tracked_dms ADD COLUMN IF NOT EXISTS account_username TEXT")
        await conn.execute("""
            UPDATE tracked_dms t
            SET account_username = a.ig_username
            FROM connected_ig_accounts a
            WHERE t.user_id = a.user_id
              AND t.account_username IS NULL
              AND a.ig_username != '__pending__'
        """)

        # ── conversations: add account_username for per-account isolation ──────
        # This is the core fix for cross-account data contamination.
        # Each conversation now belongs to a specific connected IG account.
        await conn.execute(
            "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS account_username TEXT NOT NULL DEFAULT ''"
        )
        # Back-fill: link existing conversations to an account via tracked_dms
        await conn.execute("""
            UPDATE conversations c
            SET account_username = t.account_username
            FROM tracked_dms t
            WHERE LOWER(c.participant_username) = LOWER(t.ig_username)
              AND c.account_username = ''
              AND t.account_username IS NOT NULL
              AND t.account_username != ''
        """)

        # ── messages: add account_username for per-account isolation ──────────
        await conn.execute(
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS account_username TEXT NOT NULL DEFAULT ''"
        )
        # Back-fill messages via their conversation row
        await conn.execute("""
            UPDATE messages m
            SET account_username = c.account_username
            FROM conversations c
            WHERE m.conversation_id = c.conversation_id
              AND m.account_username = ''
              AND c.account_username != ''
        """)




