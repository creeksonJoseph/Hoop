"""
dependencies.py — FastAPI shared dependencies
==============================================
LAYER: Router support — wires JWT auth into route handlers.
"""
from typing import Optional

from fastapi import Cookie, Depends, HTTPException, Request

from .db import get_pool
from .services.auth_service import decode_jwt
from .repositories import user_repo


async def get_current_user(
    request: Request,
    hoop_token: Optional[str] = Cookie(default=None),
) -> Optional[dict]:
    token = hoop_token or request.cookies.get("hoop_token")
    if not token:
        return None
    payload = decode_jwt(token)
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
        raise HTTPException(status_code=302, headers={"Location": "/auth/login"})
    return user
