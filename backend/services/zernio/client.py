"""
services/zernio/client.py
==========================
LAYER: Service — low-level HTTP primitives for the Zernio API.
Handles auth headers and wraps GET / POST / DELETE with unified
error logging. No business logic lives here.
"""
import logging
from typing import Dict

import httpx

from config import ZERNIO_BASE


def _headers(api_key: str) -> Dict[str, str]:
    """Build Zernio auth headers. api_key is a decrypted raw key — in-memory only."""
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


async def get(path: str, params: dict, api_key: str) -> dict:
    """Authenticated GET against Zernio. Raises RuntimeError on 4xx/5xx."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{ZERNIO_BASE}{path}", headers=_headers(api_key), params=params)
    if r.status_code >= 400:
        try:
            err_data = r.json()
            err_msg = err_data.get("error") or err_data.get("message") or err_data.get("detail") or str(err_data)
        except Exception:
            err_msg = r.text
        logging.error(f"[Zernio GET {path}] status={r.status_code} body={err_msg}")
        raise RuntimeError(f"[{r.status_code}] {err_msg}")
    return r.json()


async def post(path: str, body: dict, api_key: str) -> dict:
    """Authenticated POST against Zernio. Raises RuntimeError on 4xx/5xx."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{ZERNIO_BASE}{path}", headers=_headers(api_key), json=body)
    if r.status_code >= 400:
        try:
            err_data = r.json()
            err_msg = err_data.get("error") or err_data.get("message") or err_data.get("detail") or str(err_data)
        except Exception:
            err_msg = r.text
        logging.error(f"[Zernio POST {path}] status={r.status_code} body={err_msg}")
        raise RuntimeError(f"[{r.status_code}] {err_msg}")
    return r.json()


async def delete(path: str, api_key: str) -> dict:
    """Authenticated DELETE against Zernio. Returns {} on 204."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.delete(f"{ZERNIO_BASE}{path}", headers=_headers(api_key))
    if r.status_code not in (200, 204):
        r.raise_for_status()
    try:
        return r.json()
    except Exception:
        return {}
