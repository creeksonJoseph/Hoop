"""
api/routers/wingman/reply.py
==============================
LAYER: Router — POST /wingman/{token}/reply endpoint.
Allows a wingman with 'send' access to reply in a DM.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_pool
from repositories import account_repo, session_repo
from services import zernio_service

router = APIRouter()


class ReplyBody(BaseModel):
    message: str


@router.post("/{token}/reply")
async def wingman_reply(token: str, body: ReplyBody):
    """Send a reply as a wingman. Requires 'send' access level on the session."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        session = await session_repo.get_session_by_token(conn, token)

    if not session:
        raise HTTPException(404, "Link not found")
    if session["access_level"] != "send":
        raise HTTPException(403, "Read-only access — cannot send messages")
    if not body.message.strip():
        raise HTTPException(400, "Message cannot be empty")

    ig_username = session["ig_username"]
    async with pool.acquire() as conn:
        acc = await account_repo.get_any_account_for_user(conn, session["user_id"])

    if not acc or not acc["zernio_api_key_enc"]:
        raise HTTPException(404, "Account not configured")

    conv = await zernio_service.find_conversation(
        ig_username, acc["zernio_account_id"], acc["zernio_api_key_enc"]
    )
    if not conv:
        raise HTTPException(404, f"No conversation found for: {ig_username}")

    result = await zernio_service.send_message(
        conv["id"], acc["zernio_account_id"], acc["zernio_api_key_enc"], body.message
    )
    return {"success": True, "zernio_response": result}
