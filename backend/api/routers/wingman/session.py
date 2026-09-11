"""
api/routers/wingman/session.py
================================
LAYER: Router — GET /wingman/{token} endpoint.
Returns public metadata for a wingman session (no auth required).
"""
from fastapi import APIRouter, HTTPException

from db import get_pool
from repositories import session_repo

router = APIRouter()


@router.get("/{token}")
async def wingman_session_info(token: str):
    """Return public session info for a wingman access link."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        session = await session_repo.get_session_by_token(conn, token)

    if not session:
        raise HTTPException(404, "Link not found or has been removed")

    return {
        "token": token,
        "ig_username": session["ig_username"],
        "wingman_name": session["wingman_name"],
        "access_level": session["access_level"],
    }
