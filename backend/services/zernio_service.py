"""
services/zernio_service.py
===========================
LAYER: Service — all Zernio API communication.
Decrypts API keys in-memory. Never returns raw keys. Orchestrates
conversation lookup and message fetching.

Rules (Architecture.md):
- Accepts standard Python types, NOT FastAPI Request objects
- Decrypted key lives only in local scope, discarded after use
"""
from typing import Dict, List, Optional

import httpx

from config import ZERNIO_BASE
from crypto import decrypt_api_key


def _headers(api_key: str) -> Dict[str, str]:
    """Build Zernio auth headers. api_key is a decrypted raw key — in memory only."""
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


async def _get(path: str, params: dict, api_key: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{ZERNIO_BASE}{path}", headers=_headers(api_key), params=params)
    r.raise_for_status()
    return r.json()


async def _post(path: str, body: dict, api_key: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{ZERNIO_BASE}{path}", headers=_headers(api_key), json=body)
    r.raise_for_status()
    return r.json()


async def _delete(path: str, api_key: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.delete(f"{ZERNIO_BASE}{path}", headers=_headers(api_key))
    if r.status_code not in (200, 204):
        r.raise_for_status()
    try:
        return r.json()
    except Exception:
        return {}


# ── Public service functions ───────────────────────────────────────────────────

async def get_accounts(encrypted_key: str) -> List[dict]:
    """
    Fetch all connected Instagram accounts from Zernio.
    Decrypts the key in-memory — never stored or returned.
    """
    raw_key = decrypt_api_key(encrypted_key)
    try:
        data = await _get("/accounts", {"platform": "instagram"}, raw_key)
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            return data.get("accounts") or data.get("data") or data.get("items") or []
        return []
    finally:
        raw_key = ""  # always discard


async def get_connect_url(encrypted_key: str, redirect_url: str, user_id: int = 1) -> str:
    """
    Fetch the raw Meta/Instagram OAuth authorization URL from Zernio using headless=true and profileId.
    Skips Zernio UI completely — redirects user straight to official Meta OAuth login screen.
    """
    raw_key = decrypt_api_key(encrypted_key)
    profile_id = f"usr_{user_id}"
    try:
        data = await _get("/connect/instagram", {
            "redirect_url": redirect_url,
            "profileId": profile_id,
            "headless": "true",
            "loginMethod": "instagram_login"
        }, raw_key)
        url = data.get("authUrl") or data.get("url") or data.get("link")
        if url:
            return url
    except Exception:
        pass
    finally:
        raw_key = ""

    # Always return a direct OAuth connect URL that launches Instagram/Meta authorization
    return f"https://zernio.com/connect/instagram?profileId={profile_id}&redirect_url={redirect_url}&headless=true"




async def handle_oauth_callback(encrypted_key: str, code: str) -> dict:
    """
    Exchange OAuth code with Zernio to finalize Instagram account connection.
    """
    raw_key = decrypt_api_key(encrypted_key)
    try:
        return await _post("/connect/instagram", {"code": code}, raw_key)
    finally:
        raw_key = ""



async def find_conversation(
    ig_username: str,
    account_id: str,
    encrypted_key: str,
) -> Optional[dict]:
    """Paginate Zernio inbox until we find the conversation with ig_username."""
    raw_key = decrypt_api_key(encrypted_key)
    target  = ig_username.lower().strip("@")
    cursor  = None

    try:
        while True:
            params = {"platform": "instagram", "accountId": account_id, "limit": 50}
            if cursor:
                params["cursor"] = cursor
            data = await _get("/inbox/conversations", params, raw_key)
            for conv in data.get("data", []):
                pname  = (conv.get("participantName") or "").lower()
                pid    = (conv.get("participantId") or "").lower()
                puser  = (conv.get("participantUsername") or "").lower()
                ig_usr = ((conv.get("instagramProfile") or {}).get("username") or "").lower()
                if target in (pname, pid, puser, ig_usr):
                    return conv
            pagination = data.get("pagination", {})
            if not pagination.get("hasMore"):
                break
            cursor = pagination.get("nextCursor")
    finally:
        raw_key = ""  # always discard

    return None


async def get_messages(
    conv_id: str,
    account_id: str,
    encrypted_key: str,
    *,
    limit: int = 50,
    sort: str = "asc",
    cursor: Optional[str] = None,
) -> dict:
    raw_key = decrypt_api_key(encrypted_key)
    params  = {"accountId": account_id, "limit": limit, "sortOrder": sort}
    if cursor:
        params["cursor"] = cursor
    try:
        return await _get(f"/inbox/conversations/{conv_id}/messages", params, raw_key)
    finally:
        raw_key = ""


async def send_message(
    conv_id: str,
    account_id: str,
    encrypted_key: str,
    message: str,
) -> dict:
    raw_key = decrypt_api_key(encrypted_key)
    try:
        return await _post(
            f"/inbox/conversations/{conv_id}/messages",
            {"accountId": account_id, "message": message},
            raw_key,
        )
    finally:
        raw_key = ""


async def delete_message(msg_id: str, encrypted_key: str) -> dict:
    """
    Attempt to delete a message via Zernio.
    Raises httpx.HTTPStatusError if not supported (404/405).
    """
    raw_key = decrypt_api_key(encrypted_key)
    try:
        return await _delete(f"/inbox/messages/{msg_id}", raw_key)
    finally:
        raw_key = ""
