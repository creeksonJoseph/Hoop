"""
api/routers/settings.py
========================
LAYER: Router — REST endpoints for user settings & Zernio API key management.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from db import get_pool
from dependencies import require_user
from repositories import account_repo, session_repo
from services import zernio_service, auth_service
from crypto import encrypt_api_key, mask_api_key

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

    # Find any account with an encrypted key (first one is enough for key display)
    first_keyed_acc = next((a for a in accounts if a.get("zernio_api_key_enc")), None)
    if not first_keyed_acc:
        return {
            "profile": {"id": user["id"], "email": user["email"]},
            "masked_key": None,
            "ig_username": None,
            "has_connected_account": False,
            "oauth_url": None,
            "accounts": [],
        }

    enc_key = first_keyed_acc["zernio_api_key_enc"]
    masked_key = mask_api_key(enc_key)

    # ── Flaw 5 fix: Always reconcile against live Zernio account list ──────────
    # This ensures accounts disconnected on Zernio's side disappear from the
    # Switch Account list immediately on the next Settings load, instead of
    # persisting indefinitely in the DB.
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
            # (i.e. disconnected on Zernio's side)
            for acc in accounts:
                ign = acc["ig_username"]
                if ign in ("__pending__", ""):
                    continue
                acc_id = acc.get("zernio_account_id", "")
                # Remove if neither the username nor the Zernio account_id is in the live list
                if ign.lower() not in remote_usernames and acc_id not in remote_ids:
                    import logging
                    logging.info(f"[settings reconcile] removing stale account @{ign} for user_id={user['id']}")
                    await account_repo.delete_account(conn, user["id"], ign)

            # Refresh accounts list after reconciliation
            accounts = await account_repo.get_accounts_for_user(conn, user["id"])

    except Exception as e:
        import logging
        logging.warning(f"[get_settings] Zernio reconciliation failed: {e}")

    # Determine active connected account status after reconciliation
    for acc in accounts:
        if acc["ig_username"] and acc["ig_username"] != "__pending__":
            ig_username = acc["ig_username"]
            has_connected_account = True
            break

    # Generate OAuth URL for connecting another account
    try:
        state = auth_service.make_oauth_state(user["id"])
        backend_base = f"{request.url.scheme}://{request.url.netloc}"
        redirect_uri = f"{backend_base}/api/onboarding/callback?state={state}"
        oauth_url = await zernio_service.get_connect_url(enc_key, redirect_uri, user["id"])
    except Exception as e:
        import logging
        logging.warning(f"[get_settings] OAuth URL generation failed: {e}")

    return {
        "profile": {"id": user["id"], "email": user["email"]},
        "masked_key": masked_key,
        "ig_username": ig_username,
        "has_connected_account": has_connected_account,
        "oauth_url": oauth_url,
        "accounts": [dict(a) for a in accounts],
    }



@router.put("/api-key")
async def update_api_key(body: ApiKeyBody, user=Depends(require_user)):
    key_str = body.zernio_api_key.strip()
    if not key_str:
        raise HTTPException(400, "API Key cannot be empty")

    try:
        enc_key = encrypt_api_key(key_str)
        accounts = await zernio_service.get_accounts(enc_key)
    except Exception as e:
        raise HTTPException(400, f"Invalid API Key: {e}")

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
    pool = await get_pool()
    async with pool.acquire() as conn:
        accounts = await account_repo.get_accounts_for_user(conn, user["id"])
        for acc in accounts:
            revoked_tokens = await session_repo.delete_all_sessions_for_ig(
                conn, user["id"], acc["ig_username"]
            )
            for token in revoked_tokens:
                pass  # Supabase Realtime notifies clients
            await account_repo.delete_account(conn, user["id"], acc["ig_username"])
