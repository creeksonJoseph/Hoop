"""
api/routers/admin.py
=====================
LAYER: Router — admin-only message operations.
"""
from fastapi import APIRouter, Depends, HTTPException

from dependencies import require_user
from repositories import account_repo
from services import zernio_service
from db import get_pool

from api.errors import NotFoundError, ZernioAPIError

router = APIRouter(prefix="/admin", tags=["Admin"])


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
        import logging
        logging.error(f"[admin_delete_message] Zernio delete error for msg_id={msg_id}: {e}")
        raise ZernioAPIError("Message deletion is not supported or failed on Instagram.", status_code=501, code="DELETE_UNSUPPORTED")
