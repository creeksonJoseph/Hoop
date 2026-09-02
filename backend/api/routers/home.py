"""
api/routers/home.py
====================
LAYER: Router — /home page and HTMX DM list fragment.
"""
from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from db import get_pool
from dependencies import get_current_user, require_user
from repositories import account_repo

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

    # Check if the user has any connected accounts yet — if not, send to onboarding
    pool = await get_pool()
    async with pool.acquire() as conn:
        cnt = await account_repo.count_accounts_for_user(conn, user["id"])

    if cnt == 0:
        return RedirectResponse("/onboarding", status_code=302)

    return _render(request, "home.html", {"user": user})


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
    HTMX form — adds a DM username to the list.
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
        acc = await account_repo.get_any_account_for_user(conn, user["id"])
        if not acc:
            return HTMLResponse(
                '<p class="text-danger text-sm px-4">No Instagram account connected yet</p>',
                status_code=400,
            )
        await account_repo.upsert_account(
            conn, user["id"], ig_username,
            acc["zernio_account_id"], acc["zernio_api_key_enc"],
        )
        rows = await account_repo.list_dm_usernames_with_session_counts(conn, user["id"])

    dms = [dict(r) for r in rows]
    return _render(request, "partials/dm_list.html", {"dms": dms})
