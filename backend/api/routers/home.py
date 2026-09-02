"""
api/routers/home.py
====================
LAYER: Router — /home page and HTMX DM list fragment.
"""
from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from db import get_pool
from dependencies import get_current_user, require_user
from repositories import account_repo, session_repo
from ws_manager import manager

router = APIRouter()


def _render(request: Request, tpl: str, ctx: dict = None, status: int = 200) -> HTMLResponse:
    from main import templates
    flashed = request.session.pop("_flash", [])
    context = {"request": request, "get_flashed_messages": lambda with_categories=True: flashed}
    if ctx:
        context.update(ctx)
    return templates.TemplateResponse(tpl, context, status_code=status)


@router.get("/home", response_class=HTMLResponse)
async def home_page(request: Request, user=Depends(get_current_user)):
    if not user:
        return RedirectResponse("/auth/login", status_code=302)

    # Check if the user has any connected accounts or API key yet — if not, send to onboarding
    pool = await get_pool()
    async with pool.acquire() as conn:
        cnt = await account_repo.count_accounts_for_user(conn, user["id"])
        accounts = await account_repo.get_accounts_for_user(conn, user["id"])

    if cnt == 0:
        return RedirectResponse("/onboarding", status_code=302)

    has_real_account = any(a["ig_username"] and a["ig_username"] != "__pending__" for a in accounts)

    return _render(request, "home.html", {
        "user": user,
        "has_real_account": has_real_account,
        "active_page": "home",
    })


@router.get("/home/dms", response_class=HTMLResponse)
async def home_dms_fragment(request: Request, user=Depends(require_user)):
    """
    HTMX fragment — returns the DM list (or empty state).
    Replaces the skeleton on /home.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await account_repo.list_dm_usernames_with_session_counts(conn, user["id"])
    dms = [dict(r) for r in rows]
    return _render(request, "partials/dm_list.html", {"dms": dms})


@router.post("/home/add-dm", response_class=HTMLResponse)
async def add_dm(
    request: Request,
    user=Depends(require_user),
    ig_username: str = Form(...),
):
    """
    HTMX form — adds a DM username to tracked_dms list.
    Returns the updated DM list fragment.
    hx-sync="this:drop" on the form prevents duplicate submissions.
    """
    ig_username = ig_username.strip().lstrip("@").lower()
    if not ig_username:
        return HTMLResponse(
            '<p class="text-danger text-sm px-4">Username cannot be empty</p>',
            status_code=400,
        )

    pool = await get_pool()
    async with pool.acquire() as conn:
        accounts = await account_repo.get_accounts_for_user(conn, user["id"])
        has_real_account = any(a["ig_username"] and a["ig_username"] != "__pending__" for a in accounts)
        if not has_real_account:
            return HTMLResponse(
                '<p class="text-yellow-400 text-sm px-4 font-semibold">⚠️ Connect an Instagram account first in Settings before adding DMs.</p>',
                status_code=400,
            )

        if await account_repo.is_own_connected_account(conn, user["id"], ig_username):
            return HTMLResponse(
                '<p class="text-yellow-400 text-sm px-4">That is your own connected Instagram account! Enter the username of a person you are chatting with.</p>',
                status_code=400,
            )

        await account_repo.add_tracked_dm(conn, user["id"], ig_username)
        rows = await account_repo.list_dm_usernames_with_session_counts(conn, user["id"])

    dms = [dict(r) for r in rows]
    return _render(request, "partials/dm_list.html", {"dms": dms})



@router.delete("/home/dms/{ig_username}", response_class=HTMLResponse)
async def delete_dm(
    request: Request,
    ig_username: str,
    user=Depends(require_user),
):
    """
    Deletes a conversation from tracked DMs.
    1. Revokes and notifies all active wingman WebSocket connections.
    2. Deletes all wingman sessions from DB.
    3. Deletes the DM entry from tracked_dms (connected IG credentials & API key remain 100% safe).
    4. Returns updated DM list HTMX partial.
    """
    ig_username = ig_username.strip().lstrip("@").lower()
    pool = await get_pool()
    async with pool.acquire() as conn:
        revoked_tokens = await session_repo.delete_all_sessions_for_ig(conn, user["id"], ig_username)
        await account_repo.delete_tracked_dm(conn, user["id"], ig_username)
        rows = await account_repo.list_dm_usernames_with_session_counts(conn, user["id"])

    # Notify all active wingmans that their session is revoked
    for token in revoked_tokens:
        await manager.broadcast_to_wingman(token, {"type": "access_revoked"})

    dms = [dict(r) for r in rows]
    return _render(request, "partials/dm_list.html", {"dms": dms})


