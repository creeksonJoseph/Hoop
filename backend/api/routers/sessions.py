"""
api/routers/sessions.py
========================
LAYER: Router — wingman session management pages and HTMX partials.
"""
from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from db import get_pool
from dependencies import require_user
from repositories import session_repo
from services.session_service import (
    format_session_for_display,
    make_wingman_token,
    new_session_id,
    validate_access_level,
)
from ws_manager import manager

router = APIRouter()


def _render(request: Request, tpl: str, ctx: dict = None, status: int = 200) -> HTMLResponse:
    from main import templates
    flashed = request.session.pop("_flash", [])
    context = {"request": request, "get_flashed_messages": lambda with_categories=True: flashed}
    if ctx:
        context.update(ctx)
    return templates.TemplateResponse(tpl, context, status_code=status)


class GenerateBody(BaseModel):
    wingman_name: str
    access_level: str = "read"


# ── Sessions page (shell — loads skeleton, then fragment) ──────────────────────

@router.get("/sessions/{ig_username}", response_class=HTMLResponse)
async def sessions_page(request: Request, ig_username: str, user=Depends(require_user)):
    return _render(request, "sessions.html", {
        "ig_username": ig_username.lower().lstrip("@"),
        "user": user,
    })


@router.get("/sessions/{ig_username}/list", response_class=HTMLResponse)
async def sessions_list_fragment(request: Request, ig_username: str, user=Depends(require_user)):
    """HTMX fragment — replaces skeleton with real session cards."""
    ig_username = ig_username.lower().lstrip("@")
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await session_repo.get_sessions_for_ig(conn, user["id"], ig_username)
    sessions = [format_session_for_display(dict(r)) for r in rows]
    return _render(request, "partials/sessions_list.html", {"sessions": sessions})


# ── Generate wingman link ──────────────────────────────────────────────────────

@router.post("/admin/dms/{ig_username}/sessions")
async def generate_session(
    ig_username: str,
    body: GenerateBody,
    user=Depends(require_user),
):
    ig_username = ig_username.lower().lstrip("@")

    if not validate_access_level(body.access_level) or body.access_level == "revoked":
        from fastapi import HTTPException
        raise HTTPException(400, "access_level must be 'read' or 'send'")

    token = make_wingman_token(body.wingman_name, ig_username)
    pool  = await get_pool()

    async with pool.acquire() as conn:
        exists = await session_repo.session_token_exists(conn, token)
        if exists:
            await session_repo.upsert_session_token(conn, token, body.access_level)
            row = await session_repo.get_session_by_token(conn, token)
            return {"token": token, "session_id": row["id"]}

        sid = new_session_id()
        await session_repo.create_session(
            conn, sid, user["id"], ig_username,
            body.wingman_name, token, body.access_level,
        )

    return {"token": token, "session_id": sid}


# ── Update session access level (HTMX PATCH) ──────────────────────────────────

@router.patch("/admin/sessions/{session_id}", response_class=HTMLResponse)
async def update_session(
    request: Request,
    session_id: str,
    user=Depends(require_user),
    access_level: str = Form(...),
):
    if not validate_access_level(access_level):
        from fastapi import HTTPException
        raise HTTPException(400, "Invalid access_level")

    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await session_repo.update_session_access(conn, session_id, user["id"], access_level)

    if not row:
        from fastapi import HTTPException
        raise HTTPException(404, "Session not found")

    if access_level == "revoked":
        await manager.broadcast_to_wingman(row["token"], {"type": "access_revoked"})

    s = format_session_for_display(dict(row))
    return _render(request, "partials/session_card.html", {"s": s})


# ── Delete session ─────────────────────────────────────────────────────────────

@router.delete("/admin/sessions/{session_id}", response_class=HTMLResponse)
async def delete_session(session_id: str, user=Depends(require_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await session_repo.delete_session(conn, session_id, user["id"])
    if row:
        await manager.broadcast_to_wingman(row["token"], {"type": "access_revoked"})
    return HTMLResponse("")  # empty → HTMX removes the element
