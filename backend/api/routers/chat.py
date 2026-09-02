"""
api/routers/chat.py
====================
LAYER: Router — REST endpoints for messages.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from db import get_pool
from dependencies import require_user
from repositories import account_repo
from services import zernio_service

router = APIRouter(prefix="/messages", tags=["Messages"])


class ReplyBody(BaseModel):
    message: str


@router.get("")
async def get_messages(
    username: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    sort: str = Query(default="asc"),
    cursor: Optional[str] = Query(default=None),
    user=Depends(require_user),
):
    ig_user = (username or "").strip().lstrip("@").lower() or None
    pool = await get_pool()
    async with pool.acquire() as conn:
        acc = (
            await account_repo.get_account(conn, user["id"], ig_user)
            if ig_user
            else await account_repo.get_any_account_for_user(conn, user["id"])
        )

    if not acc or not acc["zernio_api_key_enc"]:
        raise HTTPException(404, "No connected account found")

    conv = await zernio_service.find_conversation(
        acc["ig_username"], acc["zernio_account_id"], acc["zernio_api_key_enc"]
    )
    if not conv:
        raise HTTPException(404, f"No conversation with: {acc['ig_username']}")

    data = await zernio_service.get_messages(
        conv["id"],
        acc["zernio_account_id"],
        acc["zernio_api_key_enc"],
        limit=limit,
        sort=sort if sort in ("asc", "desc") else "asc",
        cursor=cursor,
    )
    raw = data.get("messages", [])

    pool2 = await get_pool()
    async with pool2.acquire() as conn:
        for msg in raw:
            await conn.execute(
                """
                INSERT INTO messages
                    (id, conversation_id, sender_id, sender_name, message, direction, created_at, platform)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                ON CONFLICT (id) DO NOTHING
                """,
                msg["id"], conv["id"], msg.get("senderId"), msg.get("senderName"),
                msg.get("message"), msg.get("direction"), msg.get("createdAt"),
                msg.get("platform", "instagram"),
            )

    return {
        "conversation_id": conv["id"],
        "participant_name": conv.get("participantName"),
        "instagram_username": (conv.get("instagramProfile") or {}).get("username"),
        "total_returned": len(raw),
        "pagination": data.get("pagination"),
        "messages": [
            {
                "id": m["id"], "message": m.get("message"),
                "direction": m.get("direction"), "sender_name": m.get("senderName"),
                "created_at": m.get("createdAt"), "attachments": m.get("attachments", []),
            }
            for m in raw
        ],
    }


@router.post("/reply")
async def reply(
    body: ReplyBody,
    username: Optional[str] = Query(default=None),
    user=Depends(require_user),
):
    if not body.message.strip():
        raise HTTPException(400, "Message cannot be empty")

    ig_user = (username or "").strip().lstrip("@").lower() or None
    pool = await get_pool()
    async with pool.acquire() as conn:
        acc = (
            await account_repo.get_account(conn, user["id"], ig_user)
            if ig_user
            else await account_repo.get_any_account_for_user(conn, user["id"])
        )

    if not acc or not acc["zernio_api_key_enc"]:
        raise HTTPException(404, "No connected account found")

    conv = await zernio_service.find_conversation(
        acc["ig_username"], acc["zernio_account_id"], acc["zernio_api_key_enc"]
    )
    if not conv:
        raise HTTPException(404, f"No conversation with: {acc['ig_username']}")

    result = await zernio_service.send_message(
        conv["id"], acc["zernio_account_id"], acc["zernio_api_key_enc"], body.message
    )
    return {"success": True, "sent_message": body.message, "zernio_response": result}
