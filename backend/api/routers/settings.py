"""
api/routers/settings.py
========================
LAYER: Router - REST endpoints for user settings & Zernio API key management.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from db import get_pool
from dependencies import require_user
from repositories import account_repo, session_repo
from services import zernio_service, auth_service
from crypto import encrypt_api_key, mask_api_key
import logging
from api.errors import ValidationError, AuthenticationError, ZernioAPIError

router = APIRouter(prefix="/settings", tags=["Settings"])


class ApiKeyBody(BaseModel):
    zernio_api_key: str


@router.get("")
async def get_settings(request: Request, user=Depends(require_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        accounts = await account_repo.get_accounts_for_user(conn, user["id"])

    masked_key = None
    ig_username = None
    has_connected_account = False
    oauth_url = None

    # Find any account with an encrypted key (first one is enough for key display).
    # __key_only__ sentinels are created by delete_api_key to preserve the key after
    # disconnecting all IG accounts, so users can reconnect without re-entering the key.
    SENTINEL_USERNAMES = {"__pending__", "__key_only__"}
    first_keyed_acc = next((a for a in accounts if a.get("zernio_api_key_enc")), None)
    if not first_keyed_acc:
        return {
            "profile": {"id": user["id"], "email": user["email"]},
            "masked_key": None,
            "ig_username": None,
            "has_connected_account": False,
            "has_api_key": False,
            "oauth_url": None,
            "accounts": [],
        }

    enc_key = first_keyed_acc["zernio_api_key_enc"]
    masked_key = mask_api_key(enc_key)

    # Reconcile against live Zernio account list
    try:
        remote_accounts = await zernio_service.get_accounts(enc_key)
        remote_ids = {
            (ra.get("_id") or ra.get("id") or "")
            for ra in remote_accounts
            if (ra.get("_id") or ra.get("id"))
        }
        remote_usernames = {
            (ra.get("username") or ra.get("instagramUsername") or "").lower().strip()
            for ra in remote_accounts
        }

        pool = await get_pool()
        async with pool.acquire() as conn:
            # Add any Zernio accounts not yet in our DB
            for ra in remote_accounts:
                r_user = (ra.get("username") or ra.get("instagramUsername") or "").strip().lower()
                r_id = ra.get("_id") or ra.get("id") or ""
                if r_user and r_id:
                    await account_repo.upsert_account(conn, user["id"], r_user, r_id, enc_key)

            # Remove DB accounts that Zernio no longer knows about
            for acc in accounts:
                ign = acc["ig_username"]
                if ign in SENTINEL_USERNAMES or not ign:
                    continue
                acc_id = acc.get("zernio_account_id", "")
                if ign.lower() not in remote_usernames and acc_id not in remote_ids:
                    logging.info(f"[settings reconcile] removing stale account @{ign} for user_id={user['id']}")
                    await account_repo.delete_account(conn, user["id"], ign)

            # Refresh accounts list after reconciliation
            accounts = await account_repo.get_accounts_for_user(conn, user["id"])

            # If reconciliation removed the last real IG account (e.g. user disconnected
            # from Zernio's dashboard externally), preserve the key in a sentinel so the
            # user can reconnect from Settings without having to re-enter their key.
            real_after = [a for a in accounts if a["ig_username"] not in SENTINEL_USERNAMES]
            sentinel_exists = any(a["ig_username"] == "__key_only__" for a in accounts)
            if not real_after and not sentinel_exists:
                logging.info(f"[settings reconcile] all accounts removed externally for user_id={user['id']} - preserving key")
                await account_repo.upsert_account(conn, user["id"], "__key_only__", "key_only", enc_key)
                accounts = await account_repo.get_accounts_for_user(conn, user["id"])


    except Exception as e:
        logging.warning(f"[get_settings] Zernio reconciliation failed: {e}")

    # Determine active connected account status after reconciliation.
    # Sentinel rows (__pending__, __key_only__) don't count as real accounts.
    for acc in accounts:
        ign = acc["ig_username"]
        if ign and ign not in SENTINEL_USERNAMES:
            ig_username = ign
            has_connected_account = True
            break

    # Generate OAuth URL for connecting / reconnecting an account
    try:
        state = auth_service.make_oauth_state(user["id"])
        backend_base = f"{request.url.scheme}://{request.url.netloc}"
        redirect_uri = f"{backend_base}/api/onboarding/callback?state={state}"
        oauth_url = await zernio_service.get_connect_url(enc_key, redirect_uri, user["id"])
    except Exception as e:
        logging.warning(f"[get_settings] OAuth URL generation failed: {e}")

    # Filter out sentinel rows from the accounts list returned to the frontend
    real_accounts = [dict(a) for a in accounts if a["ig_username"] not in SENTINEL_USERNAMES]

    return {
        "profile": {"id": user["id"], "email": user["email"]},
        "masked_key": masked_key,
        "ig_username": ig_username,
        "has_connected_account": has_connected_account,
        "has_api_key": True,
        "oauth_url": oauth_url,
        "accounts": real_accounts,
    }


@router.put("/api-key")
async def update_api_key(body: ApiKeyBody, user=Depends(require_user)):
    key_str = body.zernio_api_key.strip()
    if not key_str:
        raise ValidationError("API Key cannot be empty", code="API_KEY_REQUIRED")

    try:
        enc_key = encrypt_api_key(key_str)
        accounts = await zernio_service.get_accounts(enc_key)
    except Exception as e:
        logging.error(f"[update_api_key] Zernio API key verification failed: {e}")
        raise AuthenticationError("Invalid Zernio API Key. Please verify your key.", code="INVALID_ZERNIO_KEY")

    pool = await get_pool()
    if not accounts:
        async with pool.acquire() as conn:
            await account_repo.upsert_account(conn, user["id"], "__pending__", "pending", enc_key)
        return {"message": "API Key saved. Please connect your Instagram account.", "status": "pending_oauth"}

    async with pool.acquire() as conn:
        for acc in accounts:
            ig_user = acc.get("username") or acc.get("instagramUsername") or acc.get("name") or ""
            acc_id = acc.get("_id") or acc.get("id") or acc.get("accountId") or ""
            if ig_user and acc_id:
                await account_repo.upsert_account(conn, user["id"], ig_user, acc_id, enc_key)

    return {"message": "API Key updated & accounts re-linked", "status": "connected"}


@router.delete("/api-key", status_code=204)
async def delete_api_key(user=Depends(require_user)):
    """Full wipe of all user data when they disconnect via the app.

    Removes all wingman sessions, tracked DMs, messages, conversations, and
    connected accounts (including sentinels). The API key is NOT preserved.
    The frontend should log the user out and redirect to onboarding.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        await account_repo.delete_all_user_data(conn, user["id"])

