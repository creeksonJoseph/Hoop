"""
api/routers/onboarding/callback.py
=====================================
LAYER: Router — GET /onboarding/callback.

Handles the OAuth return from Meta/Zernio after Instagram authorisation.
User identity is recovered from a signed 'state' token embedded in the
redirect URI — no JWT cookie is required for this cross-origin flow.
"""
import logging
import os
from typing import Optional

from fastapi import APIRouter, Query, Request
from fastapi.responses import RedirectResponse

from db import get_pool
from repositories import account_repo
from services import zernio_service, auth_service

router = APIRouter()

FRONTEND_BASE = os.getenv("FRONTEND_URL", "https://frontend-eight-inky-38.vercel.app")


@router.get("/callback")
async def onboarding_callback(
    request: Request,
    state: Optional[str] = None,
    connected: Optional[str] = None,
    account_id: Optional[str] = Query(None, alias="accountId"),
    username: Optional[str] = None,
    connect_token: Optional[str] = Query(None, alias="connect_token"),
    code: Optional[str] = None,
    error: Optional[str] = None,
):
    """
    OAuth callback — handles return from Zernio/Meta after Instagram authorization.
    User is identified via a signed 'state' token embedded in the redirect_uri.
    No JWT/session cookie required — safe for cross-origin OAuth redirects.
    """
    if error:
        logging.warning(f"[onboarding/callback] OAuth error: {error}")
        return RedirectResponse(f"{FRONTEND_BASE}/settings?error=oauth_failed")

    # Resolve user from signed state token
    user_id = auth_service.verify_oauth_state(state) if state else None

    if not user_id:
        logging.warning(f"[onboarding/callback] Invalid or missing state: {state!r}")
        return RedirectResponse(f"{FRONTEND_BASE}/settings?error=invalid_state")

    pool = await get_pool()
    async with pool.acquire() as conn:
        acc = await account_repo.get_any_account_for_user(conn, user_id)

        # Zernio sends back: connected=instagram, accountId, username
        if connected == "instagram" and account_id and username:
            ig_user = username.strip().lstrip("@").lower()
            enc_key = acc["zernio_api_key_enc"] if acc else None
            if ig_user and enc_key:
                await account_repo.upsert_account(conn, user_id, ig_user, account_id, enc_key)
                logging.info(f"[onboarding/callback] Connected @{ig_user} for user_id={user_id}")
                return RedirectResponse(f"{FRONTEND_BASE}/home?connected=1&account={ig_user}")

        # Fallback: OAuth code exchange (some Zernio flows use this)
        if code and acc and acc.get("zernio_api_key_enc"):
            try:
                await zernio_service.handle_oauth_callback(acc["zernio_api_key_enc"], code)
                accounts = await zernio_service.get_accounts(acc["zernio_api_key_enc"])
                last_ig = ""
                for a in accounts:
                    ig_user = a.get("username") or a.get("instagramUsername") or ""
                    acc_id = a.get("_id") or a.get("id") or ""
                    if ig_user and acc_id:
                        await account_repo.upsert_account(
                            conn, user_id, ig_user, acc_id, acc["zernio_api_key_enc"]
                        )
                        last_ig = ig_user
                acc_param = f"&account={last_ig}" if last_ig else ""
                return RedirectResponse(f"{FRONTEND_BASE}/home?connected=1{acc_param}")
            except Exception as e:
                logging.warning(f"[onboarding/callback] Code exchange failed: {e}")

    return RedirectResponse(f"{FRONTEND_BASE}/home?connected=1")
