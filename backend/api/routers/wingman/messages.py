"""
api/routers/wingman/messages.py
=================================
LAYER: Router — GET /wingman/{token}/messages endpoint.

Strategy:
  1. Return from local DB if messages already exist there.
  2. Fallback: hit Zernio to seed the DB for the first time.
"""
from fastapi import APIRouter, HTTPException

from db import get_pool
from repositories import account_repo, message_repo, session_repo
from services import zernio_service

router = APIRouter()


def _extract_profile(conv: dict, fallback: str) -> tuple:
    """Extract (display_name, avatar_url) from a Zernio conversation dict."""
    p_data = conv.get("instagramProfile") or conv.get("participant") or {}
    display_name = (
        p_data.get("name")
        or p_data.get("displayName")
        or p_data.get("full_name")
        or conv.get("participantName")
        or conv.get("name")
        or fallback
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
    return display_name, avatar_url


@router.get("/{token}/messages")
async def wingman_messages(token: str):
    """Fetch messages for a wingman session. No authentication required — token-based."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        session = await session_repo.get_session_by_token(conn, token)

    if not session:
        raise HTTPException(404, "Link not found")
    if session["access_level"] == "revoked":
        raise HTTPException(403, "Access revoked")

    ig_username = session["ig_username"]

    # 1. Try local database first (fast path)
    async with pool.acquire() as conn:
        db_messages = await message_repo.get_messages_for_participant(conn, ig_username)
        conv_rec = await message_repo.get_conversation_by_participant(conn, ig_username)

    if db_messages:
        conv_id = conv_rec["conversation_id"] if conv_rec else (db_messages[0].get("conversation_id") or "db_conv")
        pic_url = conv_rec.get("profile_pic_url") if conv_rec else None
        p_name = conv_rec.get("participant_name") if conv_rec else ig_username
        return {
            "conversation_id": conv_id,
            "participant_name": p_name,
            "profile_pic_url": pic_url,
            "messages": [
                {
                    "id": m["id"],
                    "message": m.get("message"),
                    "direction": m.get("direction"),
                    "sender_name": m.get("sender_name") or ig_username,
                    "created_at": m.get("created_at"),
                    "attachments": [],
                }
                for m in db_messages
            ],
        }

    # 2. Fallback to Zernio API if DB is empty (first-time access)
    async with pool.acquire() as conn:
        acc = await account_repo.get_any_account_for_user(conn, session["user_id"])

    if not acc or not acc.get("zernio_api_key_enc"):
        raise HTTPException(404, "Account not configured")

    conv = await zernio_service.find_conversation(
        ig_username, acc["zernio_account_id"], acc["zernio_api_key_enc"]
    )
    if not conv:
        raise HTTPException(404, f"No conversation found for: {ig_username}")

    data = await zernio_service.get_messages(
        conv["id"], acc["zernio_account_id"], acc["zernio_api_key_enc"],
        limit=50, sort="desc",
    )
    raw_list = data.get("messages") or data.get("data") or []
    raw_messages = list(reversed(raw_list))

    display_name, avatar_url = _extract_profile(conv, ig_username)

    async with pool.acquire() as conn:
        await message_repo.upsert_conversation(conn, conv["id"], ig_username, display_name, avatar_url)
        await message_repo.upsert_messages_batch(conn, raw_messages, conv["id"])


    return {
        "conversation_id": conv["id"],
        "participant_name": display_name,
        "profile_pic_url": avatar_url,
        "messages": [
            {
                "id": m["id"],
                "message": m.get("text") or m.get("message"),
                "direction": m.get("direction"),
                "sender_name": (m.get("sender") or {}).get("name") or m.get("senderName") or ig_username,
                "created_at": m.get("sentAt") or m.get("createdAt"),
                "attachments": m.get("attachments", []),
            }
            for m in raw_messages
        ],
    }
