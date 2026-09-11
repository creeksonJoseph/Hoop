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
    sort: str = Query(default="desc"),
    cursor: Optional[str] = Query(default=None),
    user=Depends(require_user),
):
    ig_target = (username or "").strip().lstrip("@").lower() or None
    pool = await get_pool()
    async with pool.acquire() as conn:
        acc = await account_repo.get_any_account_for_user(conn, user["id"])

    if not acc or not acc.get("zernio_api_key_enc") or acc.get("ig_username") == "__pending__" or acc.get("zernio_account_id") == "pending":
        raise HTTPException(400, "No connected Instagram account found. Please connect your Instagram account in Settings.")

    target_user = ig_target or acc["ig_username"]
    try:
        conv = await zernio_service.find_conversation(
            target_user,
            acc["zernio_account_id"],
            acc["zernio_api_key_enc"],
        )
    except Exception as e:
        raise HTTPException(502, f"Failed to look up conversation on Zernio: {e}")

    if not conv:
        raise HTTPException(404, f"No conversation found for: @{target_user}")

    sort_order = sort if sort in ("asc", "desc") else "desc"
    try:
        data = await zernio_service.get_messages(
            conv["id"],
            acc["zernio_account_id"],
            acc["zernio_api_key_enc"],
            limit=limit,
            sort=sort_order,
            cursor=cursor,
        )
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch messages from Zernio: {e}")

    raw = data.get("messages", [])
    if sort_order == "desc":
        raw = list(reversed(raw))

    pool2 = await get_pool()
    async with pool2.acquire() as conn:
        for msg in raw:
            sender = msg.get("sender") or {}
            raw_ts = msg.get("sentAt") or msg.get("createdAt")
            from datetime import datetime, timezone
            if isinstance(raw_ts, (int, float)):
                ts_sec = raw_ts / 1000 if raw_ts > 1e10 else raw_ts
                parsed_ts = datetime.fromtimestamp(ts_sec, tz=timezone.utc)
            elif isinstance(raw_ts, str):
                try:
                    parsed_ts = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
                except ValueError:
                    parsed_ts = datetime.now(tz=timezone.utc)
            else:
                parsed_ts = datetime.now(tz=timezone.utc)
            await conn.execute(
                """
                INSERT INTO messages
                    (id, conversation_id, sender_id, sender_name, message, direction, created_at, platform)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                ON CONFLICT (id) DO NOTHING
                """,
                msg["id"], conv["id"],
                sender.get("id") or msg.get("senderId"),
                sender.get("name") or sender.get("username") or msg.get("senderName"),
                msg.get("text") or msg.get("message"),
                msg.get("direction"), parsed_ts, "instagram",
            )

    return {
        "conversation_id": conv["id"],
        "participant_name": conv.get("participantName"),
        "instagram_username": (conv.get("instagramProfile") or {}).get("username"),
        "total_returned": len(raw),
        "pagination": data.get("pagination"),
        "messages": [
            {
                "id": m["id"],
                "message": m.get("text") or m.get("message"),
                "direction": m.get("direction"),
                "sender_name": (m.get("sender") or {}).get("name") or (m.get("sender") or {}).get("username") or m.get("senderName"),
                "created_at": m.get("sentAt") or m.get("createdAt"),
                "attachments": m.get("attachments", []),
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

    ig_target = (username or "").strip().lstrip("@").lower() or None
    pool = await get_pool()
    async with pool.acquire() as conn:
        acc = await account_repo.get_any_account_for_user(conn, user["id"])

    if not acc or not acc.get("zernio_api_key_enc") or acc.get("ig_username") == "__pending__" or acc.get("zernio_account_id") == "pending":
        raise HTTPException(400, "No connected Instagram account found. Please connect your Instagram account in Settings.")

    target_user = ig_target or acc["ig_username"]
    try:
        conv = await zernio_service.find_conversation(
            target_user,
            acc["zernio_account_id"],
            acc["zernio_api_key_enc"],
        )
    except Exception as e:
        raise HTTPException(502, f"Failed to look up conversation on Zernio: {e}")

    if not conv:
        raise HTTPException(404, f"No active conversation found on Instagram for handle: @{target_user}")

    try:
        result = await zernio_service.send_message(
            conv["id"], acc["zernio_account_id"], acc["zernio_api_key_enc"], body.message
        )
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg or "Unauthorized" in err_msg:
            raise HTTPException(401, "Zernio API key is invalid or revoked.")
        if "outside of allowed window" in err_msg.lower() or "allowed window" in err_msg.lower():
            raise HTTPException(
                400,
                f"Meta's 24-hour messaging window has expired for @{target_user}. "
                "Per Meta/Instagram rules, the recipient must send a new DM to your Instagram account first before you can reply via API."
            )
        raise HTTPException(400, f"Zernio message send failed: {err_msg}")

    return {"success": True, "sent_message": body.message, "zernio_response": result}
