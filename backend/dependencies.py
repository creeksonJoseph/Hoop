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


ADMIN_EMAILS = {"charanajoseph@gmail.com"}


async def require_admin(user=Depends(require_user)) -> dict:
    email = (user.get("email") or "").strip().lower()
    if email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

