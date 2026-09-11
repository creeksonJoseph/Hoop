"""
api/routers/wingman/reply.py
==============================
LAYER: Router — POST /wingman/{token}/reply endpoint.
Allows a wingman with 'send' access to reply in a DM.
"""
import datetime
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_pool
from repositories import account_repo, message_repo, session_repo
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

    conv_id = conv["id"]
    result = await zernio_service.send_message(
        conv_id, acc["zernio_account_id"], acc["zernio_api_key_enc"], body.message
    )

    # Immediately write sent message to DB
    sent_msg_id = (
        (result.get("message") or {}).get("id")
        or result.get("id")
        or f"sent_{int(time.time() * 1000)}"
    )
    wingman_label = session.get("wingman_name") or "Wingman"
    async with pool.acquire() as conn:
        await message_repo.upsert_message(
            conn,
            msg_id=str(sent_msg_id),
            conversation_id=str(conv_id),
            sender_id=session.get("id"),
            sender_name=wingman_label,
            message=body.message,
            direction="outgoing",
            created_at=datetime.datetime.utcnow().isoformat() + "Z",
            platform="instagram",
        )

    return {"success": True, "zernio_response": result}

