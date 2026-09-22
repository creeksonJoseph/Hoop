"""
services/google_service.py
============================
LAYER: Service - Google Identity Services token verification.
Exchanges Google ID token `credential` with Google tokeninfo endpoint
and verifies that the token audience matches GOOGLE_CLIENT_ID.
"""
import logging
from typing import Dict, Any
import httpx

import config


async def verify_google_credential(credential: str) -> Dict[str, Any]:
    """
    Verify a Google ID token (`credential`) against Google's OAuth2 tokeninfo endpoint.
    Returns normalized payload dict with 'email', 'name', 'sub', 'picture'.
    Raises ValueError on invalid token or client ID mismatch.
    """
    if not credential:
        raise ValueError("Missing Google credential")

    if not config.GOOGLE_CLIENT_ID:
        raise ValueError("Google OAuth Client ID is not configured on backend")

    url = "https://oauth2.googleapis.com/tokeninfo"
    params = {"id_token": credential}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                logging.warning(f"[GoogleAuth] Token validation failed status={resp.status_code} body={resp.text}")
                raise ValueError("Google sign-in token is invalid or expired")
            
            payload = resp.json()
    except ValueError:
        raise
    except Exception as exc:
        logging.error(f"[GoogleAuth] Verification network error: {exc}")
        raise ValueError("Google sign-in verification failed") from exc

    # Validate Audience (aud) matches our configured GOOGLE_CLIENT_ID
    aud = payload.get("aud")
    if config.GOOGLE_CLIENT_ID and aud != config.GOOGLE_CLIENT_ID:
        logging.warning(f"[GoogleAuth] Audience mismatch: got {aud}, expected {config.GOOGLE_CLIENT_ID}")
        raise ValueError("Google ID token audience mismatch")

    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise ValueError("Google account did not return an email address")

    return {
        "email": email,
        "name": (payload.get("name") or email.split("@", 1)[0]).strip(),
        "sub": payload.get("sub"),
        "picture": payload.get("picture"),
    }
