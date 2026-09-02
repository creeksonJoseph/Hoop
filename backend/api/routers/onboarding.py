"""
api/routers/onboarding.py
==========================
LAYER: Router — Instagram connect onboarding flow.
"""
from typing import Optional
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
    pool = await get_pool()
    async with pool.acquire() as conn:
        cnt = await account_repo.count_accounts_for_user(conn, user["id"])
    if cnt > 0:
        return RedirectResponse("/home", status_code=302)
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
    key_str = zernio_api_key.strip()
    if not key_str:
        return HTMLResponse("""
        <div class="p-3.5 rounded-sm2 bg-danger/10 border border-danger/30 text-danger text-xs flex items-start gap-2.5 fade-up">
          <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <div>
            <p class="font-semibold mb-0.5">API Key Required</p>
            <p class="opacity-90">Please enter a valid Zernio API key.</p>
          </div>
        </div>
        """)

    # Encrypt before anything else
    try:
        enc_key = encrypt_api_key(key_str)
    except Exception as e:
        return HTMLResponse(f"""
        <div class="p-3.5 rounded-sm2 bg-danger/10 border border-danger/30 text-danger text-xs flex items-start gap-2.5 fade-up">
          <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <div>
            <p class="font-semibold mb-0.5">Encryption Error</p>
            <p class="opacity-90">Failed to process API key: {e}</p>
          </div>
        </div>
        """)

    # Validate the key against Zernio (using encrypted version internally)
    try:
        accounts = await zernio_service.get_accounts(enc_key)
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg or "Unauthorized" in err_msg:
            user_msg = "Invalid Zernio API key. Please check your key at zernio.com and try again."
        else:
            user_msg = f"Zernio API error: {err_msg}"
        return HTMLResponse(f"""
        <div class="p-3.5 rounded-sm2 bg-danger/10 border border-danger/30 text-danger text-xs flex items-start gap-2.5 fade-up">
          <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <div>
            <p class="font-semibold mb-0.5">Connection Failed</p>
            <p class="opacity-90">{user_msg}</p>
          </div>
        </div>
        """)

    if not accounts:
        # Fetch Zernio Instagram OAuth URL for Step 2
        redirect_uri = f"{request.url.scheme}://{request.url.netloc}/onboarding/callback"
        oauth_url = await zernio_service.get_connect_url(enc_key, redirect_uri)
        
        oauth_btn = f"""
        <a href="{oauth_url}" target="_blank"
           class="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold px-4 py-3 rounded-sm2 text-sm hover:opacity-90 transition-all shadow-md active:scale-95">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
          <span>⚡ Authorize Instagram via OAuth</span>
        </a>
        """ if oauth_url else """
        <a href="https://zernio.com/dashboard/accounts" target="_blank"
           class="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold px-4 py-3 rounded-sm2 text-sm hover:opacity-90 transition-all shadow-md active:scale-95">
          <span>Connect Instagram at Zernio.com ↗</span>
        </a>
        """

        return HTMLResponse(f"""
        <div class="space-y-4 fade-up">
          <!-- Step 1 status -->
          <div class="p-3 rounded-sm2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs flex items-center justify-between">
            <span class="font-semibold flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              Step 1 Complete: API Key Verified & Active
            </span>
          </div>

          <!-- Step 2 box -->
          <div class="p-4 rounded-xl2 bg-bg border border-accent/40 text-white space-y-3">
            <div>
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <span>Step 2: Connect Instagram Account</span>
              </h3>
              <p class="text-muted text-xs mt-1">Tap below to authorize Zernio to access your Instagram Business/Creator account via OAuth.</p>
            </div>
            {oauth_btn}
          </div>
        </div>
        """)

    pool  = await get_pool()
    added = 0
    async with pool.acquire() as conn:
        for acc in accounts:
            ig_user = acc.get("username") or acc.get("instagramUsername") or acc.get("name") or ""
            acc_id  = acc.get("_id") or acc.get("id") or acc.get("accountId") or ""
            if not ig_user or not acc_id:
                continue
            await account_repo.upsert_account(conn, user["id"], ig_user, acc_id, enc_key)
            added += 1

    if added == 0:
        return HTMLResponse("""
        <div class="p-3.5 rounded-sm2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs flex items-start gap-2.5 fade-up">
          <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <div>
            <p class="font-semibold mb-0.5">Account Already Connected</p>
            <p class="opacity-90">This Instagram account is already linked to your profile.</p>
          </div>
        </div>
        <script>setTimeout(() => location.href="/home", 1200)</script>
        """)

    return HTMLResponse(f"""
    <div class="p-3.5 rounded-sm2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs flex items-start gap-2.5 fade-up">
      <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
      <div>
        <p class="font-semibold mb-0.5">Connected Successfully!</p>
        <p class="opacity-90">Found {added} Instagram account(s). Redirecting to your dashboard…</p>
      </div>
    </div>
    <script>setTimeout(() => location.href="/home", 1200)</script>
    """)


@router.get("/onboarding/callback")
async def onboarding_callback(
    request: Request,
    code: Optional[str] = None,
    user=Depends(require_user),
):
    """
    OAuth Callback route — handles redirection back from Meta/Zernio OAuth authorization.
    Exchanges code, links Instagram account to user's profile, and redirects to /home.
    """
    if not code:
        return RedirectResponse("/onboarding", status_code=302)

    pool = await get_pool()
    async with pool.acquire() as conn:
        acc = await account_repo.get_any_account_for_user(conn, user["id"])
        if acc and acc["zernio_api_key_enc"]:
            try:
                await zernio_service.handle_oauth_callback(acc["zernio_api_key_enc"], code)
                accounts = await zernio_service.get_accounts(acc["zernio_api_key_enc"])
                for a in accounts:
                    ig_user = a.get("username") or a.get("instagramUsername") or a.get("name") or ""
                    acc_id  = a.get("_id") or a.get("id") or a.get("accountId") or ""
                    if ig_user and acc_id:
                        await account_repo.upsert_account(conn, user["id"], ig_user, acc_id, acc["zernio_api_key_enc"])
            except Exception:
                pass

    return RedirectResponse("/home", status_code=302)


