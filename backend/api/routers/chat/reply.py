"""
api/routers/chat/reply.py
===========================
LAYER: Router — POST /messages/reply endpoint.

Sends a message via Zernio and immediately writes the sent
message to local DB so the UI reflects it before Realtime fires.
"""
import datetime
import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel

from db import get_pool
from dependencies import require_user
from repositories import account_repo, message_repo
from services import zernio_service

router = APIRouter()


class ReplyBody(BaseModel):
    message: str


@router.post("/reply")
async def reply(
    body: ReplyBody,
    username: Optional[str] = Query(default=None),
    x_hoop_instagram_account: str | None = Header(default=None),
    user=Depends(require_user),
):
    if not body.message.strip():
        raise HTTPException(400, "Message cannot be empty")

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
        raise HTTPException(400, "No connected Instagram account found. Please connect your Instagram account in Settings.")

    target_user = ig_target or acc["ig_username"]

    # Try local DB first to find conversation_id (avoids a Zernio round-trip)
    async with pool.acquire() as conn:
        conv_record = await message_repo.get_conversation_by_participant(conn, target_user)

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
                        conn, conv_id, target_user, conv.get("participantName")
                    )
        except Exception as e:
            logging.warning(f"[reply] conversation lookup error: {e}")

    if not conv_id:
        raise HTTPException(404, f"No active conversation found on Instagram for handle: @{target_user}")

    try:
        result = await zernio_service.send_message(
            conv_id, acc["zernio_account_id"], acc["zernio_api_key_enc"], body.message
        )
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg or "Unauthorized" in err_msg:
            raise HTTPException(401, "Zernio API key is invalid or revoked.")
        if "outside of allowed window" in err_msg.lower() or "allowed window" in err_msg.lower():
            raise HTTPException(
                400,
                f"Meta's 24-hour messaging window has expired for @{target_user}. "
                "Per Meta/Instagram rules, the recipient must send a new DM to your Instagram account first before you can reply via API.",
            )
        raise HTTPException(400, f"Zernio message send failed: {err_msg}")

    # Immediately persist the sent message so the UI is snappy
    sent_msg_id = (
        (result.get("message") or {}).get("id")
        or result.get("id")
        or f"sent_{int(time.time() * 1000)}"
    )
    async with pool.acquire() as conn:
        await message_repo.upsert_message(
            conn,
            msg_id=str(sent_msg_id),
            conversation_id=str(conv_id),
            sender_id=acc.get("zernio_account_id"),
            sender_name=acc.get("ig_username") or "You",
            message=body.message,
            direction="outgoing",
            created_at=datetime.datetime.utcnow().isoformat() + "Z",
            platform="instagram",
        )

    return {"success": True, "sent_message": body.message, "zernio_response": result}
