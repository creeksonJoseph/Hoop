"""
services/redis_service.py
==========================
LAYER: Service - Upstash Redis REST API client.
Handles fast REST KV storage for OTPs, rate-limiting, and state tokens.
Catch exceptions gracefully so missing Redis never crashes the app.
"""
import json
import logging
from typing import Any, Optional
import httpx

import config


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {config.UPSTASH_REDIS_REST_TOKEN}",
        "Content-Type": "application/json",
    }


def is_redis_configured() -> bool:
    return bool(config.UPSTASH_REDIS_REST_URL and config.UPSTASH_REDIS_REST_TOKEN)


async def set_val(key: str, value: str, ttl_seconds: Optional[int] = None) -> bool:
    if not is_redis_configured():
        logging.warning("[Redis] Upstash Redis credentials not configured.")
        return False
    try:
        url = f"{config.UPSTASH_REDIS_REST_URL.rstrip('/')}/set/{key}"
        params = {}
        if ttl_seconds:
            params["EX"] = str(ttl_seconds)

        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, json=value, headers=_headers(), params=params)
            return resp.status_code == 200
    except Exception as exc:
        logging.error(f"[Redis] set_val failed for key={key}: {exc}")
        return False


async def get_val(key: str) -> Optional[str]:
    if not is_redis_configured():
        return None
    try:
        url = f"{config.UPSTASH_REDIS_REST_URL.rstrip('/')}/get/{key}"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=_headers())
            if resp.status_code == 200:
                data = resp.json()
                return data.get("result")
            return None
    except Exception as exc:
        logging.error(f"[Redis] get_val failed for key={key}: {exc}")
        return None


async def delete_key(key: str) -> bool:
    if not is_redis_configured():
        return False
    try:
        url = f"{config.UPSTASH_REDIS_REST_URL.rstrip('/')}/del/{key}"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=_headers())
            return resp.status_code == 200
    except Exception as exc:
        logging.error(f"[Redis] delete_key failed for key={key}: {exc}")
        return False


async def set_json(key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
    return await set_val(key, json.dumps(value), ttl_seconds=ttl_seconds)


async def get_json(key: str) -> Optional[Any]:
    val = await get_val(key)
    if not val:
        return None
    try:
        return json.loads(val)
    except Exception:
        return val
