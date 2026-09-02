"""
api/routers/home.py
====================
LAYER: Router — REST endpoints for DM conversation management.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db import get_pool
from dependencies import require_user
from repositories import account_repo, session_repo
from ws_manager import manager

router = APIRouter(prefix="/api/dms", tags=["DMs"])


class AddDMBody(BaseModel):
    ig_username: str


@router.get("")
async def list_dms(user=Depends(require_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await account_repo.list_dm_usernames_with_session_counts(conn, user["id"])
        accounts = await account_repo.get_accounts_for_user(conn, user["id"])
    has_real_account = any(
        a["ig_username"] and a["ig_username"] != "__pending__" for a in accounts
    )
    return {"dms": [dict(r) for r in rows], "has_real_account": has_real_account}


@router.post("", status_code=201)
async def add_dm(body: AddDMBody, user=Depends(require_user)):
    ig_username = body.ig_username.strip().lstrip("@").lower()
    if not ig_username:
        raise HTTPException(400, "Username cannot be empty")

    pool = await get_pool()
    async with pool.acquire() as conn:
        accounts = await account_repo.get_accounts_for_user(conn, user["id"])
        has_real_account = any(
            a["ig_username"] and a["ig_username"] != "__pending__" for a in accounts
        )
        if not has_real_account:
            raise HTTPException(400, "Connect an Instagram account first in Settings")

        if await account_repo.is_own_connected_account(conn, user["id"], ig_username):
            raise HTTPException(400, "That is your own connected Instagram account")

        await account_repo.add_tracked_dm(conn, user["id"], ig_username)
        rows = await account_repo.list_dm_usernames_with_session_counts(conn, user["id"])

    return {"dms": [dict(r) for r in rows]}


@router.delete("/{ig_username}")
async def delete_dm(ig_username: str, user=Depends(require_user)):
    ig_username = ig_username.strip().lstrip("@").lower()
    pool = await get_pool()
    async with pool.acquire() as conn:
        revoked_tokens = await session_repo.delete_all_sessions_for_ig(
            conn, user["id"], ig_username
        )
        await account_repo.delete_tracked_dm(conn, user["id"], ig_username)
        rows = await account_repo.list_dm_usernames_with_session_counts(conn, user["id"])

    for token in revoked_tokens:
        await manager.broadcast_to_wingman(token, {"type": "access_revoked"})

    return {"dms": [dict(r) for r in rows]}
