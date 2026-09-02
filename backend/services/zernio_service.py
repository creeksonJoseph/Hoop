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
    Confirmed response shape (GET /v1/accounts?platform=instagram):
      { "accounts": [{ "_id": "...", "platform": "instagram",
                       "username": "handle", "displayName": "...", ... }] }
    Decrypts the key in-memory — never stored or returned.
    """
    raw_key = decrypt_api_key(encrypted_key)
    try:
        data = await _get("/accounts", {"platform": "instagram"}, raw_key)
        # Docs: response body has top-level "accounts" array (not "data" or "items")
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            return data.get("accounts") or []
        return []
    finally:
        raw_key = ""  # always discard


async def get_zernio_profile_id(raw_key: str) -> Optional[str]:
    """
    Fetch the first Zernio profile _id from GET /v1/profiles.
    Confirmed response: { "profiles": [{ "_id": "...", "name": "..." }] }
    profileId in the connect flow must be the real Zernio profile _id,
    NOT a custom string like 'usr_1'.
    """
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{ZERNIO_BASE}/profiles", headers=_headers(raw_key))
            if r.status_code < 400:
                data = r.json()
                # Docs: response body has top-level "profiles" array
                profiles = data.get("profiles") if isinstance(data, dict) else data
                if profiles:
                    return profiles[0].get("_id")
    except Exception as e:
        import logging
        logging.warning(f"[Zernio get_zernio_profile_id] {e}")
    return None


async def get_connect_url(encrypted_key: str, redirect_url: str, user_id: int = 1) -> Optional[str]:
    """
    Generate a Meta OAuth authUrl using Zernio's correct endpoint:
      GET /v1/connect/instagram?profileId=<real_zernio_id>&redirect_url=...&headless=true

    Docs confirmed: GET initiates the flow and returns authUrl.
                    POST finalizes it (requires the OAuth `code` — NOT what we want here).
    """
    import logging
    raw_key = decrypt_api_key(encrypted_key)
    try:
        # Step 1: get the real Zernio profile _id (not a custom 'usr_X' string)
        profile_id = await get_zernio_profile_id(raw_key)
        if not profile_id:
            logging.warning("[Zernio get_connect_url] Could not fetch Zernio profileId from /profiles")
            return None

        # Step 2: GET /connect/instagram with query params
        params = {
            "profileId": profile_id,
            "redirect_url": redirect_url,
            "headless": "true",
            "loginMethod": "instagram_login",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(
                f"{ZERNIO_BASE}/connect/instagram",
                headers=_headers(raw_key),
                params=params,
            )
            try:
                data = r.json()
            except Exception:
                data = {}

            logging.warning(f"[Zernio GET /connect/instagram] status={r.status_code} body={data}")

            if r.status_code < 400:
                url = (
                    data.get("authUrl")
                    or data.get("auth_url")
                    or data.get("url")
                    or data.get("link")
                )
                if url:
                    return url
    except Exception as e:
        import logging
        logging.warning(f"[Zernio get_connect_url] exception: {e}")
    finally:
        raw_key = ""

    return None

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
    """
    Paginate Zernio inbox until we find the conversation with ig_username.

    Confirmed GET /v1/inbox/conversations response fields per item:
      id, platform, accountId, accountUsername,
      participantId, participantName, participantPicture,
      lastMessage, updatedTime, status, unreadCount, url,
      instagramProfile (object, optional)

    NOTE: there is no 'participantUsername' field — only 'participantName'.
    """
    raw_key = decrypt_api_key(encrypted_key)
    target  = ig_username.lower().strip("@")
    cursor  = None
    import logging

    try:
        while True:
            params = {"platform": "instagram", "accountId": account_id, "limit": 50}
            if cursor:
                params["cursor"] = cursor
            data = await _get("/inbox/conversations", params, raw_key)
            for conv in data.get("data", []):
                pname    = (conv.get("participantName") or "").lower()
                pid      = (conv.get("participantId") or "").lower()
                ig_prof  = conv.get("instagramProfile") or {}
                ig_uname = (ig_prof.get("username") or "").lower()
                logging.info(f"[find_conversation] target={target} pname={pname} pid={pid} ig_uname={ig_uname}")
                if target in (pname, pid, ig_uname):
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
