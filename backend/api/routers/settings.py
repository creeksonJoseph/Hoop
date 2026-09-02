"""
api/routers/settings.py
========================
LAYER: Router — User Settings & Zernio API Key management.
- GET /settings: Settings dashboard page with sidebar.
- POST /settings/api-key: Update Zernio API key.
- DELETE /settings/api-key: Disconnect / delete Zernio API key & IG account.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from db import get_pool
from dependencies import require_user
from repositories import account_repo, session_repo
from services import zernio_service
from crypto import encrypt_api_key, mask_api_key
from ws_manager import manager

router = APIRouter()


def _render(request: Request, tpl: str, ctx: dict = None, status: int = 200) -> HTMLResponse:
    from main import templates
    flashed = request.session.pop("_flash", [])
    context = {"request": request, "get_flashed_messages": lambda with_categories=True: flashed}
    if ctx:
        context.update(ctx)
    return templates.TemplateResponse(tpl, context, status_code=status)


@router.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request, user=Depends(require_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        accounts = await account_repo.get_accounts_for_user(conn, user["id"])

    masked_key = "No API Key Connected"
    ig_username = None

    if accounts and accounts[0]["zernio_api_key_enc"]:
        masked_key = mask_api_key(accounts[0]["zernio_api_key_enc"])
        ig_username = accounts[0]["ig_username"]

    return _render(request, "settings.html", {
        "user": user,
        "accounts": [dict(a) for a in accounts],
        "masked_key": masked_key,
        "ig_username": ig_username,
        "active_page": "settings",
    })


@router.post("/settings/api-key", response_class=HTMLResponse)
async def update_api_key(
    request: Request,
    user=Depends(require_user),
    zernio_api_key: str = Form(...),
):
    key_str = zernio_api_key.strip()
    if not key_str:
        return HTMLResponse("""
        <div class="p-3.5 rounded-sm2 bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2 fade-up">
          <span>❌ API Key cannot be empty</span>
        </div>
        """)

    try:
        enc_key = encrypt_api_key(key_str)
        accounts = await zernio_service.get_accounts(enc_key)
    except Exception as e:
        return HTMLResponse(f"""
        <div class="p-3.5 rounded-sm2 bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2 fade-up">
          <span>❌ Invalid API Key: {e}</span>
        </div>
        """)

    if not accounts:
        return HTMLResponse("""
        <div class="p-3.5 rounded-sm2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs flex items-center gap-2 fade-up">
          <span>⚠️ API Key valid, but no connected Instagram account found. Authorize Instagram first.</span>
        </div>
        """)

    pool = await get_pool()
    async with pool.acquire() as conn:
        for acc in accounts:
            ig_user = acc.get("username") or acc.get("instagramUsername") or acc.get("name") or ""
            acc_id  = acc.get("_id") or acc.get("id") or acc.get("accountId") or ""
            if ig_user and acc_id:
                await account_repo.upsert_account(conn, user["id"], ig_user, acc_id, enc_key)

    return HTMLResponse("""
    <div class="p-3.5 rounded-sm2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs flex items-center gap-2 fade-up">
      <span>✅ API Key updated & accounts re-linked! Reloading…</span>
    </div>
    <script>setTimeout(() => location.reload(), 1200)</script>
    """)


@router.delete("/settings/api-key", response_class=HTMLResponse)
async def delete_api_key(
    request: Request,
    user=Depends(require_user),
):
    """
    Disconnects & deletes all Zernio API key credentials and linked IG accounts for this user.
    Revokes all active wingman sessions over WebSockets.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        accounts = await account_repo.get_accounts_for_user(conn, user["id"])
        for acc in accounts:
            revoked_tokens = await session_repo.delete_all_sessions_for_ig(conn, user["id"], acc["ig_username"])
            for token in revoked_tokens:
                await manager.broadcast_to_wingman(token, {"type": "access_revoked"})
            await account_repo.delete_account(conn, user["id"], acc["ig_username"])

    return HTMLResponse("""
    <script>location.href="/onboarding";</script>
    """)
