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
    pool = await get_pool()
    async with pool.acquire() as conn:
        # ── Core message cache ────────────────────────────────────────────────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                conversation_id      TEXT PRIMARY KEY,
                participant_id       TEXT,
                participant_name     TEXT,
                participant_username TEXT,
                last_message         TEXT,
                updated_time         TEXT,
                platform             TEXT DEFAULT 'instagram',
                fetched_at           TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id               TEXT PRIMARY KEY,
                conversation_id  TEXT NOT NULL,
                sender_id        TEXT,
                sender_name      TEXT,
                message          TEXT,
                direction        TEXT,
                created_at       TEXT,
                platform         TEXT DEFAULT 'instagram',
                cached_at        TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        # ── Users ─────────────────────────────────────────────────────────────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id            SERIAL PRIMARY KEY,
                email         TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at    TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        # ── Connected IG accounts (per user, with encrypted Zernio key) ───────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS connected_ig_accounts (
                id                   SERIAL PRIMARY KEY,
                user_id              INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                ig_username          TEXT NOT NULL,
                zernio_account_id    TEXT NOT NULL,
                zernio_api_key_enc   TEXT NOT NULL,
                last_message         TEXT,
                added_at             TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, ig_username)
            )
        """)

        # ── Wingman sessions ──────────────────────────────────────────────────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS wingman_sessions (
                id           TEXT PRIMARY KEY,
                user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                ig_username  TEXT NOT NULL,
                wingman_name TEXT NOT NULL,
                token        TEXT UNIQUE NOT NULL,
                access_level TEXT NOT NULL DEFAULT 'read',
                created_at   TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        # ── Tracked DMs (external conversations tracked on /home) ────────────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS tracked_dms (
                id           SERIAL PRIMARY KEY,
                user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                ig_username  TEXT NOT NULL,
                last_message TEXT,
                added_at     TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, ig_username)
            )
        """)

        # Ensure column exists for connected_ig_accounts
        await conn.execute("""
            ALTER TABLE connected_ig_accounts
                ADD COLUMN IF NOT EXISTS zernio_api_key_enc TEXT
        """)


