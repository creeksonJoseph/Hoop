"""
dependencies.py — FastAPI shared dependencies
==============================================
LAYER: Router support — wires JWT Bearer auth into route handlers.
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
) -> Optional[dict]:
    if not credentials:
        return None
    payload = decode_jwt(credentials.credentials)
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
