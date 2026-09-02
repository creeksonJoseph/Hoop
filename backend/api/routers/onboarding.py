"""
api/routers/onboarding.py
==========================
LAYER: Router — REST endpoints for Instagram connect onboarding flow.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from db import get_pool
from dependencies import require_user
from repositories import account_repo
from services import zernio_service
from crypto import encrypt_api_key

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


class ConnectBody(BaseModel):
    zernio_api_key: str


@router.post("/connect")
async def onboarding_connect(body: ConnectBody, user=Depends(require_user)):
    """
    Validates user's Zernio key, encrypts it, saves accounts.
    Raw key is used once then discarded — only Fernet cipher is persisted.
    """
    key_str = body.zernio_api_key.strip()
    if not key_str:
        raise HTTPException(400, "API Key is required")

    try:
        enc_key = encrypt_api_key(key_str)
    except Exception as e:
        raise HTTPException(400, f"Encryption error: {e}")

    try:
        accounts = await zernio_service.get_accounts(enc_key)
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg or "Unauthorized" in err_msg:
            raise HTTPException(401, "Invalid Zernio API key")
        raise HTTPException(400, f"Zernio API error: {err_msg}")

    if not accounts:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await account_repo.upsert_account(conn, user["id"], "__pending__", "pending", enc_key)
        return {"status": "pending_oauth", "connect_url": "/api/onboarding/connect/instagram"}

    pool = await get_pool()
    added = 0
    async with pool.acquire() as conn:
        for acc in accounts:
            ig_user = acc.get("username") or ""
            acc_id = acc.get("_id") or ""
            if not ig_user or not acc_id:
                continue
            await account_repo.upsert_account(conn, user["id"], ig_user, acc_id, enc_key)
            added += 1

    if added == 0:
        raise HTTPException(409, "Account already connected")

    return {"status": "connected", "accounts_added": added}


@router.get("/connect/instagram")
async def connect_instagram(request: Request, user=Depends(require_user)):
    """Redirects user to Zernio/Meta OAuth screen."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        acc = await account_repo.get_any_account_for_user(conn, user["id"])

    if not acc or not acc.get("zernio_api_key_enc"):
        raise HTTPException(400, "No API key found — complete step 1 first")

    redirect_uri = f"{request.url.scheme}://{request.url.netloc}/api/onboarding/callback"
    auth_url = await zernio_service.get_connect_url(
        acc["zernio_api_key_enc"], redirect_uri, user["id"]
    )

    if not auth_url:
        raise HTTPException(502, "Failed to get OAuth URL from Zernio")

    return RedirectResponse(auth_url, status_code=307)


@router.get("/callback")
async def onboarding_callback(
    request: Request,
    user=Depends(require_user),
    connected: Optional[str] = None,
    account_id: Optional[str] = Query(None, alias="accountId"),
    username: Optional[str] = None,
    code: Optional[str] = None,
    error: Optional[str] = None,
):
    """OAuth callback — handles return from Zernio/Meta after Instagram authorization."""
    import logging

    import os
    frontend_base = os.getenv("FRONTEND_URL", "https://frontend-eight-inky-38.vercel.app")

    if error:
        logging.warning(f"[onboarding/callback] OAuth error: {error}")
        return RedirectResponse(f"{frontend_base}/settings?error=oauth_failed")

    pool = await get_pool()
    async with pool.acquire() as conn:
        acc = await account_repo.get_any_account_for_user(conn, user["id"])

        if connected == "instagram" and account_id and username:
            ig_user = username.strip().lstrip("@").lower()
            enc_key = acc["zernio_api_key_enc"] if acc else None
            if ig_user and enc_key:
                await account_repo.upsert_account(conn, user["id"], ig_user, account_id, enc_key)
                return RedirectResponse(f"{frontend_base}/home")

        if code and acc and acc.get("zernio_api_key_enc"):
            try:
                await zernio_service.handle_oauth_callback(acc["zernio_api_key_enc"], code)
                accounts = await zernio_service.get_accounts(acc["zernio_api_key_enc"])
                for a in accounts:
                    ig_user = a.get("username") or a.get("instagramUsername") or ""
                    acc_id = a.get("_id") or a.get("id") or ""
                    if ig_user and acc_id:
                        await account_repo.upsert_account(
                            conn, user["id"], ig_user, acc_id, acc["zernio_api_key_enc"]
                        )
            except Exception as e:
                logging.warning(f"[onboarding/callback] Code exchange failed: {e}")

    return RedirectResponse(f"{frontend_base}/home")
