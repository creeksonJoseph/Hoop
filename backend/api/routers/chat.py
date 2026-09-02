"""
api/routers/chat.py
====================
LAYER: Router — admin chat screen & messages API.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel

from db import get_pool
from dependencies import get_current_user, require_user
from repositories import account_repo
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


@router.get("/chat/{ig_username}", response_class=HTMLResponse)
async def chat_page(request: Request, ig_username: str, user=Depends(get_current_user)):
    if not user:
        return RedirectResponse("/auth/login", status_code=302)
    return _render(request, "chat.html", {
        "ig_username": ig_username.lower().lstrip("@"),
        "user": user,
    })


# ── Messages API (consumed by chat.html JS) ────────────────────────────────────

@router.get("/messages")
async def get_messages(
    username: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    sort: str = Query(default="asc"),
    cursor: Optional[str] = Query(default=None),
    user=Depends(require_user),
):
    ig_user = (username or "").strip().lstrip("@").lower() or None
    pool    = await get_pool()
    async with pool.acquire() as conn:
        acc = (
            await account_repo.get_account(conn, user["id"], ig_user)
            if ig_user
            else await account_repo.get_any_account_for_user(conn, user["id"])
        )

    if not acc or not acc["zernio_api_key_enc"]:
        from fastapi import HTTPException
        raise HTTPException(404, "No connected account found")

    conv = await zernio_service.find_conversation(
        acc["ig_username"], acc["zernio_account_id"], acc["zernio_api_key_enc"]
    )
    if not conv:
        from fastapi import HTTPException
        raise HTTPException(404, f"No conversation with: {acc['ig_username']}")

    data = await zernio_service.get_messages(
        conv["id"], acc["zernio_account_id"], acc["zernio_api_key_enc"],
        limit=limit, sort=sort if sort in ("asc", "desc") else "asc", cursor=cursor,
    )
    raw = data.get("messages", [])

    # Cache in DB
    pool2 = await get_pool()
    async with pool2.acquire() as conn:
        for msg in raw:
            await conn.execute("""
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


@router.post("/messages/reply")
async def reply(
    body: ReplyBody,
    username: Optional[str] = Query(default=None),
    user=Depends(require_user),
):
    if not body.message.strip():
        from fastapi import HTTPException
        raise HTTPException(400, "Message cannot be empty")

    ig_user = (username or "").strip().lstrip("@").lower() or None
    pool    = await get_pool()
    async with pool.acquire() as conn:
        acc = (
            await account_repo.get_account(conn, user["id"], ig_user)
            if ig_user
            else await account_repo.get_any_account_for_user(conn, user["id"])
        )

    if not acc or not acc["zernio_api_key_enc"]:
        from fastapi import HTTPException
        raise HTTPException(404, "No connected account found")

    conv = await zernio_service.find_conversation(
        acc["ig_username"], acc["zernio_account_id"], acc["zernio_api_key_enc"]
    )
    if not conv:
        from fastapi import HTTPException
        raise HTTPException(404, f"No conversation with: {acc['ig_username']}")

    result = await zernio_service.send_message(
        conv["id"], acc["zernio_account_id"], acc["zernio_api_key_enc"], body.message
    )
    return {"success": True, "sent_message": body.message, "zernio_response": result}
