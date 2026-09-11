"""
api/routers/wingman.py
=======================
LAYER: Router — public wingman REST endpoints (no auth required, token-based).
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_pool
from repositories import account_repo, message_repo, session_repo

router = APIRouter(prefix="/wingman", tags=["Wingman"])


class ReplyBody(BaseModel):
    message: str


@router.get("/{token}")
async def wingman_session_info(token: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        session = await session_repo.get_session_by_token(conn, token)

    if not session:
        raise HTTPException(404, "Link not found or has been removed")

    return {
        "token": token,
        "ig_username": session["ig_username"],
        "wingman_name": session["wingman_name"],
        "access_level": session["access_level"],
    }


@router.get("/{token}/messages")
async def wingman_messages(token: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        session = await session_repo.get_session_by_token(conn, token)

    if not session:
        raise HTTPException(404, "Link not found")
    if session["access_level"] == "revoked":
        raise HTTPException(403, "Access revoked")

    ig_username = session["ig_username"]

    # 1. Try local database first
    async with pool.acquire() as conn:
        db_messages = await message_repo.get_messages_for_participant(conn, ig_username)
        conv_rec = await message_repo.get_conversation_by_participant(conn, ig_username)

    if db_messages:
        conv_id = conv_rec["conversation_id"] if conv_rec else (db_messages[0].get("conversation_id") or "db_conv")
        return {
            "conversation_id": conv_id,
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
            ]
        }

    # 2. Fallback to Zernio API if DB is empty
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
    raw_messages = list(reversed(data.get("messages", [])))

    async with pool.acquire() as conn:
        await message_repo.upsert_conversation(conn, conv["id"], ig_username, conv.get("participantName"))
        await message_repo.upsert_messages_batch(conn, raw_messages, conv["id"])

    return {
        "conversation_id": conv["id"],
        "messages": [
            {
                "id": m["id"], "message": m.get("text") or m.get("message"),
                "direction": m.get("direction"), "sender_name": (m.get("sender") or {}).get("name") or m.get("senderName") or ig_username,
                "created_at": m.get("sentAt") or m.get("createdAt"), "attachments": m.get("attachments", []),
            }
            for m in raw_messages
        ]
    }


@router.post("/{token}/reply")
async def wingman_reply(token: str, body: ReplyBody):
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

    result = await zernio_service.send_message(
        conv["id"], acc["zernio_account_id"], acc["zernio_api_key_enc"], body.message
    )
    return {"success": True, "zernio_response": result}
