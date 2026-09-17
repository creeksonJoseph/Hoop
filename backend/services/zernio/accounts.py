"""
services/zernio/accounts.py
=============================
LAYER: Service - Zernio account and OAuth operations.
Handles connecting Instagram accounts, fetching account lists,
and generating / exchanging OAuth tokens.
"""
import logging
from typing import Optional

import httpx

from config import ZERNIO_BASE
from crypto import decrypt_api_key
from . import client


async def get_accounts(encrypted_key: str) -> list:
    """
    Fetch all connected Instagram accounts from Zernio.
    Confirmed response shape (GET /v1/accounts?platform=instagram):
      { "accounts": [{ "_id": "...", "platform": "instagram",
                       "username": "handle", "displayName": "...", ... }] }
    Decrypts the key in-memory - never stored or returned.
    """
    raw_key = decrypt_api_key(encrypted_key)
    try:
        data = await client.get("/accounts", {"platform": "instagram"}, raw_key)
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
        from services.zernio.client import _headers
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(f"{ZERNIO_BASE}/profiles", headers=_headers(raw_key))
            if r.status_code < 400:
                data = r.json()
                # Docs: response body has top-level "profiles" array
                profiles = data.get("profiles") if isinstance(data, dict) else data
                if profiles:
                    return profiles[0].get("_id")
    except Exception as e:
        logging.warning(f"[Zernio get_zernio_profile_id] {e}")
    return None


async def get_connect_url(encrypted_key: str, redirect_url: str, user_id: int = 1) -> Optional[str]:
    """
    Generate a Meta OAuth authUrl using Zernio's correct endpoint:
      GET /v1/connect/instagram?profileId=<real_zernio_id>&redirect_url=...&headless=true

    Docs confirmed: GET initiates the flow and returns authUrl.
                    POST finalizes it (requires the OAuth `code` - NOT what we want here).
    """
    from services.zernio.client import _headers
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
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.get(
                f"{ZERNIO_BASE}/connect/instagram",
                headers=_headers(raw_key),
                params=params,
            )
            try:
                data = r.json()
            except Exception:
                data = {}

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
        return await client.post("/connect/instagram", {"code": code}, raw_key)
    finally:
        raw_key = ""
