"""
api/routers/auth.py
====================
LAYER: Router — REST endpoints for authentication.
All responses are JSON. No HTML, no redirects, no sessions.
"""
import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db import get_pool
from dependencies import require_user
from repositories import user_repo, account_repo
from services.auth_service import create_jwt, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class LoginBody(BaseModel):
    email: str
    password: str


class SignupBody(BaseModel):
    email: str
    password: str
    confirm_password: str


@router.post("/login")
async def login(body: LoginBody):
    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await user_repo.get_user_by_email(conn, body.email)
        cnt = await account_repo.count_accounts_for_user(conn, user["id"]) if user else 0

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")

    token = create_jwt(user["id"], user["email"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "onboarded": cnt > 0,
        "user": {"id": user["id"], "email": user["email"]},
    }


@router.post("/signup", status_code=201)
async def signup(body: SignupBody):
    if body.password != body.confirm_password:
        raise HTTPException(400, "Passwords do not match")

    pool = await get_pool()
    try:
        async with pool.acquire() as conn:
            await user_repo.create_user(conn, body.email, hash_password(body.password))
    except asyncpg.UniqueViolationError:
        raise HTTPException(409, "An account with that email already exists")

    return {"message": "Account created — please sign in"}


@router.get("/me")
async def me(user=Depends(require_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        cnt = await account_repo.count_accounts_for_user(conn, user["id"])
    return {"id": user["id"], "email": user["email"], "onboarded": cnt > 0}
