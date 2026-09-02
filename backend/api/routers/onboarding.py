"""
api/routers/onboarding.py
==========================
LAYER: Router — Instagram connect onboarding flow.
"""
from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from db import get_pool
from dependencies import require_user
from repositories import account_repo
from services import zernio_service
from crypto import encrypt_api_key

router = APIRouter()


def _render(request: Request, tpl: str, ctx: dict = None, status: int = 200) -> HTMLResponse:
    from main import templates
    flashed = request.session.pop("_flash", [])
    context = {"request": request, "get_flashed_messages": lambda with_categories=True: flashed}
    if ctx:
        context.update(ctx)
    return templates.TemplateResponse(tpl, context, status_code=status)


@router.get("/onboarding", response_class=HTMLResponse)
async def onboarding_page(request: Request, user=Depends(require_user)):
    return _render(request, "onboarding.html", {"user": user})


@router.post("/onboarding/connect", response_class=HTMLResponse)
async def onboarding_connect(
    request: Request,
    user=Depends(require_user),
    zernio_api_key: str = Form(...),
):
    """
    HTMX endpoint — validates user's Zernio key, encrypts it, saves accounts.
    The raw key is used once here, then immediately discarded.
    Only the Fernet-encrypted cipher is persisted.
    """
    # Encrypt before anything else
    try:
        enc_key = encrypt_api_key(zernio_api_key.strip())
    except Exception:
        return HTMLResponse(
            '<p class="text-danger text-sm">❌ Failed to process API key</p>',
            status_code=400,
        )

    # Validate the key against Zernio (using encrypted version internally)
    try:
        accounts = await zernio_service.get_accounts(enc_key)
    except Exception as e:
        return HTMLResponse(
            f'<p class="text-danger text-sm">❌ Invalid key or Zernio error: {e}</p>',
            status_code=400,
        )

    if not accounts:
        return HTMLResponse(
            '<p class="text-yellow-400 text-sm">⚠️ No Instagram accounts found. Connect one at zernio.com first.</p>',
            status_code=400,
        )

    pool  = await get_pool()
    added = 0
    async with pool.acquire() as conn:
        for acc in accounts:
            ig_user = acc.get("username", "")
            acc_id  = acc.get("_id", "")
            if not ig_user or not acc_id:
                continue
            await account_repo.upsert_account(conn, user["id"], ig_user, acc_id, enc_key)
            added += 1

    if added == 0:
        return HTMLResponse(
            '<p class="text-yellow-400 text-sm">⚠️ Accounts already linked or nothing new found.</p>'
        )

    return HTMLResponse(
        f'<p class="text-green-400 text-sm">✅ Connected {added} account(s)! Redirecting…</p>'
        '<script>setTimeout(() => location.href="/home", 1200)</script>'
    )
