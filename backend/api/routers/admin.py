"""
api/routers/admin.py
=====================
LAYER: Router - admin-only operations (Metrics dashboard, User management, Accounts & Sessions directory).
Protected by require_admin dependency (restricted to charanajoseph@gmail.com).
"""
import logging
from typing import List
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from dependencies import require_user, require_admin
from repositories import user_repo, account_repo, session_repo
from services import zernio_service, redis_service
from config import RESEND_API_KEY
from db import get_pool
from api.errors import NotFoundError, ZernioAPIError, ValidationError

router = APIRouter(prefix="/admin", tags=["Admin"])


class BulkDeleteUsersBody(BaseModel):
    user_ids: List[int]


@router.get("/dashboard")
async def get_admin_dashboard(admin=Depends(require_admin)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        stats = await user_repo.get_admin_dashboard_stats(conn)

    # Check health status of dependent services
    redis_ok = redis_service.is_redis_configured()
    resend_ok = bool(RESEND_API_KEY)
    db_ok = True

    stats["system_health"] = {
        "database": "healthy" if db_ok else "unhealthy",
        "redis": "healthy" if redis_ok else "unconfigured",
        "resend_email": "healthy" if resend_ok else "unconfigured",
    }
    return stats


@router.get("/users")
async def get_all_users(admin=Depends(require_admin)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        users = await user_repo.get_all_users_admin(conn)
    return {"users": users}


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, admin=Depends(require_admin)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        deleted = await user_repo.delete_user_admin(conn, user_id)

    if not deleted:
        raise NotFoundError("User not found", code="USER_NOT_FOUND")
    return {"success": True, "message": "User deleted successfully."}


@router.post("/users/bulk-delete")
async def bulk_delete_users(body: BulkDeleteUsersBody, admin=Depends(require_admin)):
    if not body.user_ids:
        raise ValidationError("User IDs list cannot be empty", code="EMPTY_USER_IDS")

    pool = await get_pool()
    async with pool.acquire() as conn:
        count = await user_repo.bulk_delete_users_admin(conn, body.user_ids)

    return {"success": True, "count": count, "message": f"Deleted {count} users successfully."}


@router.get("/accounts")
async def get_all_accounts(admin=Depends(require_admin)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        accounts = await account_repo.get_all_accounts_admin(conn)
    return {"accounts": accounts}


@router.delete("/accounts/{account_id}")
async def delete_account(account_id: int, admin=Depends(require_admin)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        deleted = await account_repo.delete_account_admin(conn, account_id)

    if not deleted:
        raise NotFoundError("Connected account not found", code="ACCOUNT_NOT_FOUND")
    return {"success": True, "message": "Connected account removed."}


@router.get("/sessions")
async def get_all_sessions(admin=Depends(require_admin)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT 
                s.id,
                s.user_id,
                s.ig_username,
                s.wingman_name,
                s.token,
                s.access_level,
                s.created_at,
                u.email AS owner_email
            FROM wingman_sessions s
            LEFT JOIN users u ON u.id = s.user_id
            ORDER BY s.created_at DESC
        """)
    return {"sessions": [dict(r) for r in rows]}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, admin=Depends(require_admin)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        deleted = await conn.fetchrow("DELETE FROM wingman_sessions WHERE id = $1 RETURNING id", session_id)

    if not deleted:
        raise NotFoundError("Wingman session token not found", code="SESSION_NOT_FOUND")
    return {"success": True, "message": "Wingman session token revoked."}


@router.delete("/messages/{msg_id}")
async def delete_message(msg_id: str, user=Depends(require_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        acc = await account_repo.get_any_account_for_user(conn, user["id"])

    if not acc or not acc["zernio_api_key_enc"]:
        raise NotFoundError("No connected account found", code="ACCOUNT_NOT_FOUND")

    try:
        result = await zernio_service.delete_message(msg_id, acc["zernio_api_key_enc"])
        return {"success": True, "result": result}
    except Exception as e:
        logging.error(f"[admin_delete_message] Zernio delete error for msg_id={msg_id}: {e}")
        raise ZernioAPIError("Message deletion is not supported or failed on Instagram.", status_code=501, code="DELETE_UNSUPPORTED")
