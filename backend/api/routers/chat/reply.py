from __future__ import annotations
"""
api/routers/chat/reply.py
===========================
LAYER: Router - POST /messages/reply endpoint.

Sends a message via Zernio and returns a provider ID when available.
The webhook owns persistence when the provider does not return an ID.
"""
import datetime
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel

from db import get_pool
from dependencies import require_user
from repositories import account_repo, message_repo
from services import zernio_service

from api.errors import (
    ValidationError,
    NotFoundError,
    AuthenticationError,
    ZernioAPIError,
    is_24h_window_error,
    INSTAGRAM_24H_WINDOW_ERROR_MESSAGE,
)

router = APIRouter()


class ReplyBody(BaseModel):
    message: str


@router.post("/reply")
async def reply(
    body: ReplyBody,
    username: Optional[str] = Query(default=None),
    x_hoop_instagram_account: Optional[str] = Header(default=None),
    user=Depends(require_user),
):
    if not body.message.strip():
        raise ValidationError("Message cannot be empty", code="EMPTY_MESSAGE")

    ig_target = (username or "").strip().lstrip("@").lower() or None
    pool = await get_pool()
    async with pool.acquire() as conn:
        acc = await account_repo.get_active_account(conn, user["id"], x_hoop_instagram_account)

    if (
        not acc
        or not acc.get("zernio_api_key_enc")
        or acc.get("ig_username") == "__pending__"
        or acc.get("zernio_account_id") == "pending"
    ):
        raise ValidationError(
            "No connected Instagram account found. Please connect your Instagram account in Settings.",
            code="NO_CONNECTED_ACCOUNT"
        )

    target_user = ig_target or acc["ig_username"]
    acc_username = acc["ig_username"]

    # Try local DB first to find conversation_id - scoped to this account
    async with pool.acquire() as conn:
        conv_record = await message_repo.get_conversation_by_participant(conn, target_user, account_username=acc_username)

    conv_id = conv_record["conversation_id"] if conv_record else None

    if not conv_id:
        try:
            conv = await zernio_service.find_conversation(
                target_user,
                acc["zernio_account_id"],
                acc["zernio_api_key_enc"],
            )
            if conv:
                conv_id = conv["id"]
                async with pool.acquire() as conn:
                    await message_repo.upsert_conversation(
                        conn, conv_id, target_user, conv.get("participantName"),
                        account_username=acc_username,
                    )
        except Exception as e:
            logging.warning(f"[reply] conversation lookup error: {e}")

    if not conv_id:
        raise NotFoundError(
            f"No active conversation found on Instagram for handle: @{target_user}",
            code="CONVERSATION_NOT_FOUND"
        )

    try:
        result = await zernio_service.send_message(
            conv_id, acc["zernio_account_id"], acc["zernio_api_key_enc"], body.message
        )
    except Exception as e:
        err_msg = str(e)
        logging.error(f"[reply] Send message error for @{target_user}: {err_msg}")
        if "401" in err_msg or "Unauthorized" in err_msg:
            raise AuthenticationError("Zernio API key is invalid or revoked.", code="INVALID_ZERNIO_KEY")
        if is_24h_window_error(err_msg):
            raise ValidationError(
                INSTAGRAM_24H_WINDOW_ERROR_MESSAGE,
                code="INSTAGRAM_24H_WINDOW_EXPIRED"
            )
        raise ZernioAPIError("Failed to send message to Instagram. Please try again.", status_code=502, code="REPLY_FAILED")

    sent_msg_id = (
        (result.get("message") or {}).get("id")
        or (result.get("message") or {}).get("message_id")
        or result.get("id")
        or result.get("message_id")
    )
    sent_created_at = datetime.datetime.utcnow().isoformat() + "Z" if sent_msg_id else None

    return {
        "success": True,
        "message_id": str(sent_msg_id) if sent_msg_id else None,
        "created_at": sent_created_at,
        "sent_message": body.message,
        "zernio_response": result,
    }
