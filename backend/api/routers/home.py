"""
api/routers/home.py
====================
LAYER: Router — REST endpoints for DM conversation management.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db import get_pool
from dependencies import require_user
from repositories import account_repo, message_repo, session_repo
from services import zernio_service

router = APIRouter(prefix="/dms", tags=["DMs"])


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
        acc = accounts[0] if accounts else None
        has_real_account = any(
            a["ig_username"] and a["ig_username"] != "__pending__" for a in accounts
        )
        if not has_real_account or not acc or not acc.get("zernio_api_key_enc"):
            raise HTTPException(400, "Connect an Instagram account first in Settings")

        if await account_repo.is_own_connected_account(conn, user["id"], ig_username):
            raise HTTPException(400, "That is your own connected Instagram account")

        # 1. Check if DM already exists in DB
        db_messages = await message_repo.get_messages_for_participant(conn, ig_username)
        
        # 2. If not in DB, verify that the DM/conversation exists on Zernio / Instagram
        if not db_messages:
            try:
                conv = await zernio_service.find_conversation(
                    ig_username,
                    acc["zernio_account_id"],
                    acc["zernio_api_key_enc"],
                )
            except Exception as e:
                raise HTTPException(502, f"Failed to check Instagram conversation for @{ig_username}: {e}")

            if not conv:
                raise HTTPException(
                    404,
                    f"Username @{ig_username} not found. Please add a username of someone you already have a current DM with on Instagram."
                )

            # Pre-seed DB with conversation metadata & initial messages
            p_data = conv.get("instagramProfile") or conv.get("participant") or {}
            display_name = (
                p_data.get("name")
                or p_data.get("displayName")
                or p_data.get("full_name")
                or conv.get("participantName")
                or conv.get("name")
                or ig_username
            )
            avatar_url = (
                p_data.get("profilePicUrl")
                or p_data.get("profile_pic")
                or p_data.get("profile_picture")
                or p_data.get("avatar")
                or conv.get("participantPicture")
                or conv.get("profilePicUrl")
                or conv.get("profile_pic")
            )
            await message_repo.upsert_conversation(conn, conv["id"], ig_username, display_name, avatar_url)
            try:
                data = await zernio_service.get_messages(
                    conv["id"], acc["zernio_account_id"], acc["zernio_api_key_enc"], limit=50
                )
                raw_msgs = data.get("messages", [])
                if raw_msgs:
                    await message_repo.upsert_messages_batch(conn, raw_msgs, conv["id"])
            except Exception:
                pass

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
        pass  # Supabase Realtime notifies clients

    return {"dms": [dict(r) for r in rows]}
