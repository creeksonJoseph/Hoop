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
        await conn.execute("ALTER TABLE tracked_dms ADD COLUMN IF NOT EXISTS account_username TEXT NOT NULL DEFAULT ''")
        await conn.execute("""
            UPDATE tracked_dms t
            SET account_username = a.ig_username
            FROM connected_ig_accounts a
            WHERE t.user_id = a.user_id
              AND t.account_username = ''
              AND a.ig_username != '__pending__'
        """)

        # ── tracked_dms: migrate unique constraint to include account_username ──
        # The old constraint only had (user_id, ig_username) which caused the second
        # connected account's add_dm to silently no-op when tracking a shared target.
        # We need (user_id, ig_username, account_username) so each IG account can
        # independently track the same conversation partner.
        await conn.execute("""
            DO $$
            BEGIN
                -- Drop the old narrow constraint if it still exists
                IF EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'tracked_dms_user_id_ig_username_key'
                    AND conrelid = 'tracked_dms'::regclass
                ) THEN
                    ALTER TABLE tracked_dms DROP CONSTRAINT tracked_dms_user_id_ig_username_key;
                END IF;

                -- Create the wider constraint only if it does not exist yet
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'tracked_dms_user_id_ig_username_account_username_key'
                    AND conrelid = 'tracked_dms'::regclass
                ) THEN
                    ALTER TABLE tracked_dms
                    ADD CONSTRAINT tracked_dms_user_id_ig_username_account_username_key
                    UNIQUE (user_id, ig_username, account_username);
                END IF;
            END
            $$;
        """)

        # conversations: add account_username for per-account isolation ──────
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

        # Older deployments may not have per-user ownership on wingman sessions.
        await conn.execute(
            "ALTER TABLE wingman_sessions ADD COLUMN IF NOT EXISTS user_id INTEGER"
        )

        # ── Performance indexes ──────────────────────────────────────────────────
        # All use IF NOT EXISTS so re-running on startup is safe.

        # messages: primary lookup by conversation_id with time-ordering
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
            ON messages (conversation_id, created_at ASC)
        """)

        # messages: per-account scoping used in fallback queries
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_messages_account_username
            ON messages (account_username)
        """)

        # messages: case-insensitive sender_name fallback lookup
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_messages_sender_name_lower
            ON messages (LOWER(sender_name))
        """)

        # conversations: primary account-scoped participant lookup
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_conversations_participant_account
            ON conversations (LOWER(participant_username), LOWER(account_username))
        """)

        # conversations: bare participant lookup (used in fallback / wingman routes)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_conversations_participant_lower
            ON conversations (LOWER(participant_username))
        """)

        # tracked_dms: per-user + account scoping (list DMs query)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_tracked_dms_user_account
            ON tracked_dms (user_id, LOWER(account_username))
        """)

        # tracked_dms: ig_username JOIN used in list_dm_usernames_with_session_counts
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_tracked_dms_ig_username_lower
            ON tracked_dms (LOWER(ig_username))
        """)

        # wingman_sessions: primary owner+target lookup (get_sessions_for_ig)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_wingman_sessions_user_ig
            ON wingman_sessions (user_id, ig_username)
        """)

        # wingman_sessions: token lookup used on every authenticated wingman request
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_wingman_sessions_token
            ON wingman_sessions (token)
        """)

        # wingman_sessions: ig_username + access_level filter (get_active_tokens_for_ig)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_wingman_sessions_ig_access
            ON wingman_sessions (ig_username, access_level)
        """)

        # connected_ig_accounts: per-user listing (get_accounts_for_user)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_connected_ig_accounts_user_id
            ON connected_ig_accounts (user_id)
        """)

        # connected_ig_accounts: cross-user ig_username lookup (get_account_by_ig)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_connected_ig_accounts_ig_username
            ON connected_ig_accounts (ig_username)
        """)

        # users: email lookup used on every login / registration
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_email
            ON users (email)
        """)




