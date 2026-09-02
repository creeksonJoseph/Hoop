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
from services import zernio_service
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

    if accounts and accounts[0]["zernio_api_key_enc"]:
        masked_key = mask_api_key(accounts[0]["zernio_api_key_enc"])
        for acc in accounts:
            if acc["ig_username"] and acc["ig_username"] != "__pending__":
                ig_username = acc["ig_username"]
                has_connected_account = True
                break

        redirect_uri = f"{request.url.scheme}://{request.url.netloc}/onboarding/callback"
        oauth_url = await zernio_service.get_connect_url(
            accounts[0]["zernio_api_key_enc"], redirect_uri, user["id"]
        )

    return {
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

    if not accounts:
        raise HTTPException(422, "API Key valid but no connected Instagram account found")

    pool = await get_pool()
    async with pool.acquire() as conn:
        for acc in accounts:
            ig_user = acc.get("username") or acc.get("instagramUsername") or acc.get("name") or ""
            acc_id = acc.get("_id") or acc.get("id") or acc.get("accountId") or ""
            if ig_user and acc_id:
                await account_repo.upsert_account(conn, user["id"], ig_user, acc_id, enc_key)

    return {"message": "API Key updated & accounts re-linked"}


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
