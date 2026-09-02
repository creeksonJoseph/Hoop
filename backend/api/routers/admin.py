"""
api/routers/admin.py
=====================
LAYER: Router — admin-only message operations.
"""
from fastapi import APIRouter, Depends

from ...dependencies import require_user
from ...repositories import account_repo
from ...services import zernio_service
from ...db import get_pool

router = APIRouter()


@router.delete("/admin/messages/{msg_id}")
async def delete_message(msg_id: str, user=Depends(require_user)):
    """
    Attempt to delete a message via Zernio API.
    Per Architecture.md: if Zernio doesn't support it, returns 501.
    No DB-level fake edits.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        acc = await account_repo.get_any_account_for_user(conn, user["id"])

    if not acc or not acc["zernio_api_key_enc"]:
        from fastapi import HTTPException
        raise HTTPException(404, "No connected account found")

    try:
        result = await zernio_service.delete_message(msg_id, acc["zernio_api_key_enc"])
        return {"success": True, "result": result}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(501, f"Zernio does not support message deletion: {e}")
