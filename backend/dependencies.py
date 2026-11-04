"""
dependencies.py - FastAPI shared dependencies
==============================================
LAYER: Router support - wires JWT Bearer auth into route handlers.
"""
from typing import Optional

from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from db import get_pool
from services.auth_service import decode_jwt
from repositories import user_repo

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(_bearer),
    token: Optional[str] = None,
) -> Optional[dict]:
    raw_token = credentials.credentials if credentials else token
    if not raw_token:
        return None
    payload = decode_jwt(raw_token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await user_repo.get_user_by_id(conn, int(user_id))
    return dict(user) if user else None


async def require_user(user=Depends(get_current_user)) -> dict:
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


async def require_admin(user=Depends(require_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


from fastapi import Request, Response
from services import redis_service
import time

async def rate_limit(request: Request, response: Response):
    """
    Rate limiting dependency.
    Limits clients to 10 requests per 1 minute window based on IP.
    """
    # Resolve the true client IP if behind a proxy
    client_ip = request.headers.get("x-forwarded-for") or request.headers.get("x-real-ip")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    if not client_ip:
        client_ip = request.client.host if request.client else "unknown"
    if client_ip == "unknown":
        return

    # We use a 1 minute window
    window = int(time.time()) // 60
    key = f"ratelimit:auth:{client_ip}:{window}"

    # Very basic in-memory fallback if Redis is not configured
    # To keep things simple we just rely on Redis for real rate limiting
    if not redis_service.is_redis_configured():
        return

    count = await redis_service.increment(key)
    if count == 1:
        # Set expiry for 2 minutes to be safe
        await redis_service.expire(key, 120)

    if count > 10:
        # 429 Too Many Requests
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": "60"}
        )
