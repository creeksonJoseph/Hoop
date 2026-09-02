"""
api/routers/wingman.py
=======================
LAYER: Router — public wingman REST endpoints (no auth required, token-based).
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_pool
from repositories import account_repo, session_repo
from services import zernio_service

router = APIRouter(prefix="/api/wingman", tags=["Wingman"])


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
    async with pool.acquire() as conn:
        acc = await account_repo.get_account_by_ig(conn, ig_username)

    if not acc or not acc["zernio_api_key_enc"]:
        raise HTTPException(404, "Account not configured")

    conv = await zernio_service.find_conversation(
        ig_username, acc["zernio_account_id"], acc["zernio_api_key_enc"]
    )
    if not conv:
        raise HTTPException(404, f"No conversation found for: {ig_username}")

    data = await zernio_service.get_messages(
        conv["id"], acc["zernio_account_id"], acc["zernio_api_key_enc"],
        limit=50, sort="asc",
    )
    return {
        "messages": [
            {
                "id": m["id"], "message": m.get("message"),
                "direction": m.get("direction"), "sender_name": m.get("senderName"),
                "created_at": m.get("createdAt"), "attachments": m.get("attachments", []),
            }
            for m in data.get("messages", [])
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
        acc = await account_repo.get_account_by_ig(conn, ig_username)

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
