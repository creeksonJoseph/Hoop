"""
repositories/feedback_repo.py
================================
LAYER: Repository - pure SQL operations for the feedback table.
"""
import asyncpg
from typing import List, Optional


async def init_feedback_table(conn: asyncpg.Connection) -> None:
    """Ensure the feedback table exists in PostgreSQL."""
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            category VARCHAR(50) NOT NULL DEFAULT 'feature_suggestion',
            message TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
        CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
    """)


async def create_feedback(
    conn: asyncpg.Connection,
    user_id: int,
    message: str,
    category: str = "feature_suggestion"
) -> dict:
    await init_feedback_table(conn)
    row = await conn.fetchrow("""
        INSERT INTO feedback (user_id, category, message, status, created_at)
        VALUES ($1, $2, $3, 'pending', NOW())
        RETURNING id, user_id, category, message, status, created_at
    """, user_id, category, message)
    return dict(row) if row else {}


async def get_all_feedback(conn: asyncpg.Connection) -> List[dict]:
    await init_feedback_table(conn)
    rows = await conn.fetch("""
        SELECT 
            f.id,
            f.user_id,
            f.category,
            f.message,
            f.status,
            f.created_at,
            u.email AS user_email
        FROM feedback f
        JOIN users u ON u.id = f.user_id
        ORDER BY f.created_at DESC
    """)
    return [dict(r) for r in rows]


async def get_feedback_by_id(conn: asyncpg.Connection, feedback_id: int) -> Optional[dict]:
    await init_feedback_table(conn)
    row = await conn.fetchrow("""
        SELECT 
            f.id,
            f.user_id,
            f.category,
            f.message,
            f.status,
            f.created_at,
            u.email AS user_email
        FROM feedback f
        JOIN users u ON u.id = f.user_id
        WHERE f.id = $1
    """, feedback_id)
    return dict(row) if row else None


async def update_feedback_status(conn: asyncpg.Connection, feedback_id: int, status: str) -> Optional[dict]:
    await init_feedback_table(conn)
    row = await conn.fetchrow("""
        UPDATE feedback
        SET status = $1
        WHERE id = $2
        RETURNING id, user_id, category, message, status, created_at
    """, status, feedback_id)
    return dict(row) if row else None
