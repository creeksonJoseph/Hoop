"""
api/routers/chat/messages.py
==============================
LAYER: Router — GET /messages endpoint.

Strategy:
  1. Return from local DB if messages exist (avoids Zernio API calls).
  2. On first open or force_sync=True: fetch from Zernio, persist, return.
  3. On Zernio errors: gracefully fall back to DB data if available.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from db import get_pool
from dependencies import require_user
from repositories import account_repo, message_repo
from services import zernio_service
from .formatters import extract_profile_data, format_db_messages, format_zernio_messages

router = APIRouter()


@router.get("/")
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

    if (
        not acc
        or not acc.get("zernio_api_key_enc")
        or acc.get("ig_username") == "__pending__"
        or acc.get("zernio_account_id") == "pending"
    ):
        raise HTTPException(400, "No connected Instagram account found. Please connect your Instagram account in Settings.")

    target_user = ig_target or acc["ig_username"]

    # 1. Check local DB first
    async with pool.acquire() as conn:
        existing_msgs = await message_repo.get_messages_for_participant(conn, target_user)
        existing_conv = await message_repo.get_conversation_by_participant(conn, target_user)

    # 2. Return from DB if available, not a force-sync, and not requesting a specific cursor page
    if existing_msgs and not force_sync and not cursor:
        conv_id = existing_conv["conversation_id"] if existing_conv else (existing_msgs[0].get("conversation_id") or "db_conv")
        p_name = existing_conv["participant_name"] if existing_conv else target_user
        pic_url = existing_conv.get("profile_pic_url") if existing_conv else None
        return {
            "conversation_id": conv_id,
            "participant_name": p_name,
            "instagram_username": target_user,
            "profile_pic_url": pic_url,
            "total_returned": len(existing_msgs),
            "pagination": None,
            "messages": format_db_messages(existing_msgs, target_user),
        }


    # 3. Fetch conversation from Zernio (first open or force_sync)
    try:
        conv = await zernio_service.find_conversation(
            target_user,
            acc["zernio_account_id"],
            acc["zernio_api_key_enc"],
        )
    except Exception as e:
        if existing_msgs:
            pic_url = existing_conv.get("profile_pic_url") if existing_conv else None
            return {
                "conversation_id": existing_msgs[0].get("conversation_id") or "db_conv",
                "participant_name": target_user,
                "instagram_username": target_user,
                "profile_pic_url": pic_url,
                "total_returned": len(existing_msgs),
                "pagination": None,
                "messages": format_db_messages(existing_msgs, target_user),
            }
        raise HTTPException(502, f"Failed to look up conversation on Zernio: {e}")

    if not conv:
        if existing_msgs:
            pic_url = existing_conv.get("profile_pic_url") if existing_conv else None
            return {
                "conversation_id": existing_msgs[0].get("conversation_id") or "db_conv",
                "participant_name": target_user,
                "instagram_username": target_user,
                "profile_pic_url": pic_url,
                "total_returned": len(existing_msgs),
                "pagination": None,
                "messages": format_db_messages(existing_msgs, target_user),
            }
        raise HTTPException(404, f"No conversation found for: @{target_user}")

    display_name, avatar_url = extract_profile_data(conv, target_user)

    # 4. Persist conversation metadata
    async with pool.acquire() as conn:
        await message_repo.upsert_conversation(conn, conv["id"], target_user, display_name, avatar_url)

    # 5. Fetch messages from Zernio and bulk upsert
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
            return {
                "conversation_id": conv["id"],
                "participant_name": display_name,
                "instagram_username": target_user,
                "profile_pic_url": avatar_url,
                "total_returned": len(existing_msgs),
                "pagination": None,
                "messages": format_db_messages(existing_msgs, target_user),
            }
        raise HTTPException(502, f"Failed to fetch messages from Zernio: {e}")

    raw = data.get("messages") or data.get("data") or []
    if sort_order == "desc":
        raw = list(reversed(raw))


    async with pool.acquire() as conn:
        await message_repo.upsert_messages_batch(conn, raw, conv["id"])
        db_msgs = await message_repo.get_messages_by_conversation_id(conn, conv["id"])

    final_msgs = db_msgs or raw
    return {
        "conversation_id": conv["id"],
        "participant_name": display_name,
        "instagram_username": target_user,
        "profile_pic_url": avatar_url,
        "total_returned": len(final_msgs),
        "pagination": data.get("pagination"),
        "messages": format_zernio_messages(final_msgs, target_user),
    }
