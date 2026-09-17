"""
api/routers/wingman/reply.py
==============================
LAYER: Router - POST /wingman/{token}/reply endpoint.
Allows a wingman with 'send' access to reply in a DM.
"""
import datetime
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_pool
from repositories import account_repo, message_repo, session_repo
from services import zernio_service

import logging
from api.errors import NotFoundError, ForbiddenError, ValidationError, ZernioAPIError

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
        raise NotFoundError("Link not found", code="LINK_NOT_FOUND")
    if session["access_level"] != "send":
        raise ForbiddenError("Read-only access - cannot send messages", code="READ_ONLY_ACCESS")
    if not body.message.strip():
        raise ValidationError("Message cannot be empty", code="EMPTY_MESSAGE")

    ig_username = session["ig_username"]
    async with pool.acquire() as conn:
        acc = await account_repo.get_any_account_for_user(conn, session["user_id"])

    if not acc or not acc["zernio_api_key_enc"]:
        raise NotFoundError("Account not configured", code="ACCOUNT_NOT_CONFIGURED")

    try:
        conv = await zernio_service.find_conversation(
            ig_username, acc["zernio_account_id"], acc["zernio_api_key_enc"]
        )
    except Exception as e:
        logging.error(f"[wingman_reply] Zernio conversation lookup error for @{ig_username}: {e}")
        raise ZernioAPIError("Failed to find conversation on Instagram. Please try again.", status_code=502, code="LOOKUP_FAILED")

    if not conv:
        raise NotFoundError(f"No conversation found for: {ig_username}", code="CONVERSATION_NOT_FOUND")

    conv_id = conv["id"]
    try:
        result = await zernio_service.send_message(
            conv_id, acc["zernio_account_id"], acc["zernio_api_key_enc"], body.message
        )
    except Exception as e:
        logging.error(f"[wingman_reply] Zernio send message error for @{ig_username}: {e}")
        raise ZernioAPIError("Failed to send message as wingman. Please try again.", status_code=502, code="REPLY_FAILED")

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

