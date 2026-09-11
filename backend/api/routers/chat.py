import datetime
import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from db import get_pool
from dependencies import require_user
from repositories import account_repo, message_repo
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
    force_sync: bool = Query(default=False),
    user=Depends(require_user),
):
    ig_target = (username or "").strip().lstrip("@").lower() or None
    pool = await get_pool()
    async with pool.acquire() as conn:
        acc = await account_repo.get_any_account_for_user(conn, user["id"])

    if not acc or not acc.get("zernio_api_key_enc") or acc.get("ig_username") == "__pending__" or acc.get("zernio_account_id") == "pending":
        raise HTTPException(400, "No connected Instagram account found. Please connect your Instagram account in Settings.")

    target_user = ig_target or acc["ig_username"]

    # 1. Check local DB first for existing messages & conversation
    async with pool.acquire() as conn:
        existing_msgs = await message_repo.get_messages_for_participant(conn, target_user)
        existing_conv = await message_repo.get_conversation_by_participant(conn, target_user)

    # 2. If messages exist in DB and force_sync is False -> return directly from local DB
    if existing_msgs and not force_sync:
        conv_id = existing_conv["conversation_id"] if existing_conv else (existing_msgs[0].get("conversation_id") or "db_conv")
        p_name = existing_conv["participant_name"] if existing_conv else target_user
        pic_url = existing_conv.get("profile_pic_url") if existing_conv else None
        formatted = [
            {
                "id": m["id"],
                "message": m.get("message"),
                "direction": m.get("direction"),
                "sender_name": m.get("sender_name") or target_user,
                "created_at": m.get("created_at"),
                "attachments": [],
            }
            for m in existing_msgs
        ]
        return {
            "conversation_id": conv_id,
            "participant_name": p_name,
            "instagram_username": target_user,
            "profile_pic_url": pic_url,
            "total_returned": len(formatted),
            "pagination": None,
            "messages": formatted,
        }

    # 3. If no messages in DB yet (first time opening DM) or force_sync=True:
    #    Fetch conversation from Zernio
    try:
        conv = await zernio_service.find_conversation(
            target_user,
            acc["zernio_account_id"],
            acc["zernio_api_key_enc"],
        )
    except Exception as e:
        if existing_msgs:
            pic_url = existing_conv.get("profile_pic_url") if existing_conv else None
            formatted = [
                {
                    "id": m["id"],
                    "message": m.get("message"),
                    "direction": m.get("direction"),
                    "sender_name": m.get("sender_name") or target_user,
                    "created_at": m.get("created_at"),
                    "attachments": [],
                }
                for m in existing_msgs
            ]
            return {
                "conversation_id": existing_msgs[0].get("conversation_id") or "db_conv",
                "participant_name": target_user,
                "instagram_username": target_user,
                "profile_pic_url": pic_url,
                "total_returned": len(formatted),
                "pagination": None,
                "messages": formatted,
            }
        raise HTTPException(502, f"Failed to look up conversation on Zernio: {e}")

    if not conv:
        if existing_msgs:
            pic_url = existing_conv.get("profile_pic_url") if existing_conv else None
            formatted = [
                {
                    "id": m["id"],
                    "message": m.get("message"),
                    "direction": m.get("direction"),
                    "sender_name": m.get("sender_name") or target_user,
                    "created_at": m.get("created_at"),
                    "attachments": [],
                }
                for m in existing_msgs
            ]
            return {
                "conversation_id": existing_msgs[0].get("conversation_id") or "db_conv",
                "participant_name": target_user,
                "instagram_username": target_user,
                "profile_pic_url": pic_url,
                "total_returned": len(formatted),
                "pagination": None,
                "messages": formatted,
            }
        raise HTTPException(404, f"No conversation found for: @{target_user}")

    # Extract display name and avatar URL from Zernio metadata
    p_data = conv.get("instagramProfile") or conv.get("participant") or {}
    display_name = (
        p_data.get("name")
        or p_data.get("displayName")
        or p_data.get("full_name")
        or conv.get("participantName")
        or conv.get("name")
        or target_user
    )
    avatar_url = (
        p_data.get("profilePicUrl")
        or p_data.get("profile_pic")
        or p_data.get("profile_picture")
        or p_data.get("avatar")
        or conv.get("participantPicture")
        or conv.get("profilePicUrl")
        or conv.get("profile_pic")
    )

    # 4. Store conversation mapping into DB with display name & avatar URL
    async with pool.acquire() as conn:
        await message_repo.upsert_conversation(
            conn, conv["id"], target_user, display_name, avatar_url
        )

    # 5. Fetch messages from Zernio and bulk upsert to DB
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
        if existing_msgs:
            formatted = [
                {
                    "id": m["id"],
                    "message": m.get("message"),
                    "direction": m.get("direction"),
                    "sender_name": m.get("sender_name") or target_user,
                    "created_at": m.get("created_at"),
                    "attachments": [],
                }
                for m in existing_msgs
            ]
            return {
                "conversation_id": conv["id"],
                "participant_name": conv.get("participantName"),
                "instagram_username": target_user,
                "profile_pic_url": avatar_url,
                "total_returned": len(formatted),
                "pagination": None,
                "messages": formatted,
            }
        raise HTTPException(502, f"Failed to fetch messages from Zernio: {e}")

    raw = data.get("messages", [])
    if sort_order == "desc":
        raw = list(reversed(raw))

    async with pool.acquire() as conn:
        await message_repo.upsert_messages_batch(conn, raw, conv["id"])
        db_msgs = await message_repo.get_messages_by_conversation_id(conn, conv["id"])

    final_msgs = db_msgs or raw
    formatted = [
        {
            "id": m["id"] if isinstance(m, dict) else m.get("id"),
            "message": (m.get("text") or m.get("message")) if isinstance(m, dict) else m.get("message"),
            "direction": m.get("direction") if isinstance(m, dict) else m.get("direction"),
            "sender_name": ((m.get("sender") or {}).get("name") or m.get("senderName") or m.get("sender_name")) if isinstance(m, dict) else (m.get("sender_name") or target_user),
            "created_at": (m.get("sentAt") or m.get("createdAt") or m.get("created_at")) if isinstance(m, dict) else m.get("created_at"),
            "attachments": m.get("attachments", []) if isinstance(m, dict) else [],
        }
        for m in final_msgs
    ]

    return {
        "conversation_id": conv["id"],
        "participant_name": conv.get("participantName"),
        "instagram_username": target_user,
        "profile_pic_url": avatar_url,
        "total_returned": len(formatted),
        "pagination": data.get("pagination"),
        "messages": formatted,
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

    # Try local DB first to find conversation_id
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
                "Per Meta/Instagram rules, the recipient must send a new DM to your Instagram account first before you can reply via API."
            )
        raise HTTPException(400, f"Zernio message send failed: {err_msg}")

    # Immediately save sent message to local DB
    sent_msg_id = (
        (result.get("message") or {}).get("id")
        or result.get("id")
        or f"sent_{int(time.time()*1000)}"
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

