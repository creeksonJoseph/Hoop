"""
api/routers/onboarding/connect.py
===================================
LAYER: Router — POST /onboarding/connect and GET /onboarding/connect/instagram.

Handles the first two steps of the Instagram connection flow:
  1. Validate the Zernio API key, save it, trigger OAuth.
  2. Redirect user to the Meta OAuth screen.
"""
import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from db import get_pool
from dependencies import require_user
from repositories import account_repo
from services import zernio_service, auth_service
from crypto import encrypt_api_key

router = APIRouter()

FRONTEND_BASE = os.getenv("FRONTEND_URL", "https://frontend-eight-inky-38.vercel.app")


class ConnectBody(BaseModel):
    zernio_api_key: str


@router.post("/connect")
async def onboarding_connect(request: Request, body: ConnectBody, user=Depends(require_user)):
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

        state = auth_service.make_state(user["id"])
        backend_base = f"{request.url.scheme}://{request.url.netloc}"
        redirect_uri = f"{backend_base}/api/onboarding/callback?state={state}"

        auth_url = await zernio_service.get_connect_url(enc_key, redirect_uri, user["id"])
        return {
            "status": "pending_oauth",
            "oauth_url": auth_url,
            "connect_url": auth_url or "/api/onboarding/connect/instagram",
        }

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

    # Embed signed user identity in the callback URL (no JWT cookie needed on return)
    state = auth_service.make_state(user["id"])
    backend_base = f"{request.url.scheme}://{request.url.netloc}"
    redirect_uri = f"{backend_base}/api/onboarding/callback?state={state}"

    auth_url = await zernio_service.get_connect_url(
        acc["zernio_api_key_enc"], redirect_uri, user["id"]
    )

    if not auth_url:
        raise HTTPException(502, "Failed to get OAuth URL from Zernio")

    return RedirectResponse(auth_url, status_code=307)
