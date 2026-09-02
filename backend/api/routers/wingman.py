"""
api/routers/wingman.py
=======================
LAYER: Router — public wingman view (no auth required).
"""
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from db import get_pool
from repositories import account_repo, session_repo
from services import zernio_service

router = APIRouter()


def _render(request: Request, tpl: str, ctx: dict = None, status: int = 200) -> HTMLResponse:
    from main import templates
    flashed = request.session.pop("_flash", [])
    context = {"request": request, "get_flashed_messages": lambda with_categories=True: flashed}
    if ctx:
        context.update(ctx)
    return templates.TemplateResponse(tpl, context, status_code=status)


class ReplyBody(BaseModel):
    message: str


@router.get("/view/{token}", response_class=HTMLResponse)
async def wingman_view(request: Request, token: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        session = await session_repo.get_session_by_token(conn, token)

    if not session:
        from fastapi import HTTPException
        raise HTTPException(404, "Link not found or has been removed")

    return _render(request, "wingman.html", {
        "token": token,
        "ig_username": session["ig_username"],
        "wingman_name": session["wingman_name"],
        "access_level": session["access_level"],
    })


@router.get("/view/{token}/messages")
async def wingman_messages(token: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        session = await session_repo.get_session_by_token(conn, token)

    if not session:
        from fastapi import HTTPException
        raise HTTPException(404, "Link not found")
    if session["access_level"] == "revoked":
        from fastapi import HTTPException
        raise HTTPException(403, "Access revoked")

    ig_username = session["ig_username"]
    async with pool.acquire() as conn:
        acc = await account_repo.get_account_by_ig(conn, ig_username)

    if not acc or not acc["zernio_api_key_enc"]:
        from fastapi import HTTPException
        raise HTTPException(404, "Account not configured")

    conv = await zernio_service.find_conversation(
        ig_username, acc["zernio_account_id"], acc["zernio_api_key_enc"]
    )
    if not conv:
        from fastapi import HTTPException
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


@router.post("/view/{token}/reply")
async def wingman_reply(token: str, body: ReplyBody):
    pool = await get_pool()
    async with pool.acquire() as conn:
        session = await session_repo.get_session_by_token(conn, token)

    if not session:
        from fastapi import HTTPException
        raise HTTPException(404, "Link not found")
    if session["access_level"] != "send":
        from fastapi import HTTPException
        raise HTTPException(403, "Read-only access — cannot send messages")
    if not body.message.strip():
        from fastapi import HTTPException
        raise HTTPException(400, "Message cannot be empty")

    ig_username = session["ig_username"]
    async with pool.acquire() as conn:
        acc = await account_repo.get_account_by_ig(conn, ig_username)

    if not acc or not acc["zernio_api_key_enc"]:
        from fastapi import HTTPException
        raise HTTPException(404, "Account not configured")

    conv = await zernio_service.find_conversation(
        ig_username, acc["zernio_account_id"], acc["zernio_api_key_enc"]
    )
    if not conv:
        from fastapi import HTTPException
        raise HTTPException(404, f"No conversation found for: {ig_username}")

    result = await zernio_service.send_message(
        conv["id"], acc["zernio_account_id"], acc["zernio_api_key_enc"], body.message
    )
    return {"success": True, "zernio_response": result}
