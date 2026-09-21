"""
api/routers/wingman/messages.py
=================================
LAYER: Router - GET /wingman/{token}/messages endpoint.

Strategy:
  1. Return from local DB if messages already exist there.
  2. Fallback: hit Zernio to seed the DB for the first time.
"""
import logging
from fastapi import APIRouter

from db import get_pool
from repositories import account_repo, message_repo, session_repo
from services import zernio_service
from api.errors import NotFoundError, ForbiddenError, ZernioAPIError
from api.routers.chat.formatters import format_db_messages, format_zernio_messages

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
    """Fetch messages for a wingman session. No authentication required - token-based."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        session = await session_repo.get_session_by_token(conn, token)

    if not session:
        raise NotFoundError("Link not found", code="LINK_NOT_FOUND")
    if session["access_level"] == "revoked":
        raise ForbiddenError("Access revoked", code="ACCESS_REVOKED")

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
            "messages": format_db_messages(db_messages, ig_username),
        }

    # 2. Fallback to Zernio API if DB is empty (first-time access)
    async with pool.acquire() as conn:
        acc = await account_repo.get_any_account_for_user(conn, session["user_id"])

    if not acc or not acc.get("zernio_api_key_enc"):
        raise NotFoundError("Account not configured", code="ACCOUNT_NOT_CONFIGURED")

    try:
        conv = await zernio_service.find_conversation(
            ig_username, acc["zernio_account_id"], acc["zernio_api_key_enc"]
        )
    except Exception as e:
        logging.error(f"[wingman_messages] Zernio conversation lookup error for @{ig_username}: {e}")
        raise ZernioAPIError("Failed to look up conversation. Please try again.", status_code=502, code="LOOKUP_FAILED")

    if not conv:
        raise NotFoundError(f"No conversation found for: {ig_username}", code="CONVERSATION_NOT_FOUND")

    try:
        data = await zernio_service.get_messages(
            conv["id"], acc["zernio_account_id"], acc["zernio_api_key_enc"],
            limit=50, sort="desc",
        )
    except Exception as e:
        logging.error(f"[wingman_messages] Zernio fetch messages error for @{ig_username}: {e}")
        raise ZernioAPIError("Failed to fetch messages. Please try again.", status_code=502, code="FETCH_FAILED")
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
        "messages": format_zernio_messages(raw_messages, ig_username),
    }
