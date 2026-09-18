"""
api/routers/wingman/session.py
================================
LAYER: Router - GET /wingman/{token} endpoint.
Returns public metadata for a wingman session (no auth required).
"""
from fastapi import APIRouter

from db import get_pool
from repositories import session_repo
from api.errors import NotFoundError

router = APIRouter()


@router.get("/{token}")
async def wingman_session_info(token: str):
    """Return public session info for a wingman access link."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        session = await session_repo.get_session_by_token(conn, token)

    if not session:
        raise NotFoundError("Link not found or has been removed", code="LINK_NOT_FOUND")

    return {
        "token": token,
        "ig_username": session["ig_username"],
        "wingman_name": session["wingman_name"],
        "access_level": session["access_level"],
    }
