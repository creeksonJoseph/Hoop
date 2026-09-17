from __future__ import annotations
"""
api/routers/sessions.py
========================
LAYER: Router — REST endpoints for wingman session management.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from db import get_pool
from dependencies import require_user
from repositories import account_repo, session_repo
from services.session_service import (
    format_session_for_display,
    make_wingman_token,
    new_session_id,
    validate_access_level,
)

from api.errors import ValidationError, NotFoundError

router = APIRouter(prefix="/sessions", tags=["Sessions"])


class GenerateBody(BaseModel):
    wingman_name: str
    access_level: str = "read"


class UpdateAccessBody(BaseModel):
    access_level: str


@router.get("")
@router.get("/{ig_username}")
async def list_sessions(
    ig_username: str = "all",
    x_hoop_instagram_account: Optional[str] = Header(default=None),
    user=Depends(require_user),
):
    ig_username = (ig_username or "all").lower().lstrip("@")
    pool = await get_pool()
    async with pool.acquire() as conn:
        account = await account_repo.get_active_account(conn, user["id"], x_hoop_instagram_account)
        if x_hoop_instagram_account and not account:
            raise ValidationError("Selected Instagram account is not connected", code="ACCOUNT_NOT_CONNECTED")
        if ig_username in ("all", "*", ""):
            rows = await session_repo.get_all_sessions_for_user(
                conn, user["id"], account["ig_username"] if account else None
            )
        else:
            rows = await session_repo.get_sessions_for_ig(
                conn, user["id"], ig_username,
                account["ig_username"] if account else None,
            )
    return {"sessions": [format_session_for_display(dict(r)) for r in rows]}


@router.post("/{ig_username}", status_code=201)
async def generate_session(
    ig_username: str,
    body: GenerateBody,
    x_hoop_instagram_account: Optional[str] = Header(default=None),
    user=Depends(require_user),
):
    ig_username = ig_username.lower().lstrip("@")

    if not validate_access_level(body.access_level) or body.access_level == "revoked":
        raise ValidationError("access_level must be 'read' or 'send'", code="INVALID_ACCESS_LEVEL")

    token = make_wingman_token(body.wingman_name, ig_username)
    pool = await get_pool()

    async with pool.acquire() as conn:
        account = await account_repo.get_active_account(conn, user["id"], x_hoop_instagram_account)
        if not account:
            raise ValidationError("No active Instagram account selected", code="NO_ACTIVE_ACCOUNT")
        exists = await session_repo.session_token_exists(conn, token)
        if exists:
            await session_repo.upsert_session_token(conn, token, body.access_level)
            row = await session_repo.get_session_by_token(conn, token)
            return {"token": token, "session_id": row["id"]}

        sid = new_session_id()
        await session_repo.create_session(
            conn, sid, user["id"], ig_username,
            body.wingman_name, token, body.access_level,
        )

    return {"token": token, "session_id": sid}


@router.patch("/{session_id}")
async def update_session(
    session_id: str, body: UpdateAccessBody, user=Depends(require_user)
):
    if not validate_access_level(body.access_level):
        raise ValidationError("Invalid access_level", code="INVALID_ACCESS_LEVEL")

    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await session_repo.update_session_access(
            conn, session_id, user["id"], body.access_level
        )

    if not row:
        raise NotFoundError("Session not found", code="SESSION_NOT_FOUND")

    if body.access_level == "revoked":
        pass

    return format_session_for_display(dict(row))


@router.delete("/{session_id}", status_code=204)
async def delete_session(session_id: str, user=Depends(require_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await session_repo.delete_session(conn, session_id, user["id"])
    if not row:
        raise NotFoundError("Session not found or already deleted", code="SESSION_NOT_FOUND")
