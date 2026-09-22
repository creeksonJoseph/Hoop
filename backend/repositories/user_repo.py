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


async def get_all_users_admin(conn: asyncpg.Connection) -> list:
    rows = await conn.fetch("""
        SELECT 
            u.id, 
            u.email, 
            u.created_at,
            COUNT(DISTINCT a.id) AS account_count
        FROM users u
        LEFT JOIN connected_ig_accounts a ON a.user_id = u.id
        GROUP BY u.id, u.email, u.created_at
        ORDER BY u.created_at DESC
    """)
    return [dict(r) for r in rows]


async def delete_user_admin(conn: asyncpg.Connection, user_id: int) -> bool:
    res = await conn.execute("DELETE FROM users WHERE id = $1", user_id)
    return "DELETE 1" in res


async def bulk_delete_users_admin(conn: asyncpg.Connection, user_ids: list) -> int:
    res = await conn.execute("DELETE FROM users WHERE id = ANY($1::int[])", user_ids)
    try:
        return int(res.split(" ")[1])
    except Exception:
        return 0


async def get_admin_dashboard_stats(conn: asyncpg.Connection) -> dict:
    total_users = await conn.fetchval("SELECT COUNT(*) FROM users") or 0
    total_accounts = await conn.fetchval("SELECT COUNT(*) FROM connected_ig_accounts WHERE ig_username != '__pending__'") or 0
    total_messages = await conn.fetchval("SELECT COUNT(*) FROM messages") or 0
    
    # Active wingman sessions
    total_sessions = 0
    try:
        total_sessions = await conn.fetchval("SELECT COUNT(*) FROM wingman_sessions") or 0
    except Exception:
        pass

    # Pending feedback/feature suggestions
    total_feedback = 0
    try:
        total_feedback = await conn.fetchval("SELECT COUNT(*) FROM feedback WHERE status = 'pending'") or 0
    except Exception:
        pass

    recent_users_rows = await conn.fetch("""
        SELECT id, email, created_at 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
    """)

    return {
        "total_users": total_users,
        "total_accounts": total_accounts,
        "total_messages": total_messages,
        "total_sessions": total_sessions,
        "pending_feedback": total_feedback,
        "recent_users": [dict(r) for r in recent_users_rows],
    }
