"""
api/routers/auth.py
====================
LAYER: Router - REST endpoints for authentication.
All responses are JSON. No HTML, no redirects, no sessions.
"""
import random
import secrets
import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db import get_pool
from dependencies import require_user
from repositories import user_repo, account_repo
from services.auth_service import create_jwt, hash_password, verify_password
from services import google_service, email_service, redis_service

from api.errors import AuthenticationError, ValidationError, ConflictError

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginBody(BaseModel):
    email: str
    password: str


class SignupBody(BaseModel):
    email: str
    password: str
    confirm_password: str


class GoogleLoginBody(BaseModel):
    credential: str


class SendOTPBody(BaseModel):
    email: str


class VerifyOTPBody(BaseModel):
    email: str
    code: str
    password: str
    confirm_password: str


@router.post("/login")
async def login(body: LoginBody):
    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await user_repo.get_user_by_email(conn, body.email)
        cnt = await account_repo.count_accounts_for_user(conn, user["id"]) if user else 0

    if not user:
        raise AuthenticationError("User does not exist. Please check your email or sign up.", code="USER_NOT_FOUND")

    if not verify_password(body.password, user["password_hash"]):
        raise AuthenticationError("Incorrect password. Please try again.", code="INVALID_PASSWORD")

    token = create_jwt(user["id"], user["email"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "onboarded": cnt > 0,
        "user": {"id": user["id"], "email": user["email"]},
    }


@router.post("/google")
async def google_login(body: GoogleLoginBody):
    if not body.credential:
        raise ValidationError("Missing Google credential token", code="MISSING_CREDENTIAL")

    try:
        g_user = await google_service.verify_google_credential(body.credential)
    except ValueError as exc:
        raise AuthenticationError(str(exc), code="GOOGLE_AUTH_FAILED")

    email = g_user["email"]
    random_hash = hash_password(secrets.token_urlsafe(32))

    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await user_repo.get_or_create_google_user(conn, email, random_hash)
        cnt = await account_repo.count_accounts_for_user(conn, user["id"])

    token = create_jwt(user["id"], user["email"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "onboarded": cnt > 0,
        "user": {"id": user["id"], "email": user["email"]},
    }


@router.post("/send-otp")
async def send_otp(body: SendOTPBody):
    email = body.email.strip().lower()
    if not email:
        raise ValidationError("Email is required", code="MISSING_EMAIL")

    pool = await get_pool()
    async with pool.acquire() as conn:
        existing = await user_repo.get_user_by_email(conn, email)
    
    if existing:
        raise ConflictError("An account with that email already exists", code="EMAIL_ALREADY_EXISTS")

    # Generate 6-digit OTP code
    otp_code = f"{random.randint(100000, 999999)}"
    redis_key = f"otp:{email}"

    # Store OTP in Redis for 10 minutes (600 seconds)
    await redis_service.set_val(redis_key, otp_code, ttl_seconds=600)

    # Send email via Resend
    success, msg = await email_service.send_otp_email(email, otp_code)
    return {"success": success, "message": msg}


@router.post("/verify-otp", status_code=201)
async def verify_otp(body: VerifyOTPBody):
    if body.password != body.confirm_password:
        raise ValidationError("Passwords do not match", code="PASSWORD_MISMATCH")

    email = body.email.strip().lower()
    code = body.code.strip()
    redis_key = f"otp:{email}"

    stored_code = await redis_service.get_val(redis_key)
    if not stored_code or stored_code != code:
        raise ValidationError("Invalid or expired verification code", code="INVALID_OTP")

    # Clean up OTP in Redis once verified
    await redis_service.delete_key(redis_key)

    pool = await get_pool()
    try:
        async with pool.acquire() as conn:
            user = await user_repo.create_user(conn, email, hash_password(body.password))
    except asyncpg.UniqueViolationError:
        raise ConflictError("An account with that email already exists", code="EMAIL_ALREADY_EXISTS")

    token = create_jwt(user["id"], user["email"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "onboarded": False,
        "user": {"id": user["id"], "email": user["email"]},
    }


class ForgotPasswordBody(BaseModel):
    email: str


class ResetPasswordBody(BaseModel):
    email: str
    otp: str
    new_password: str
    confirm_password: str


class ChangePasswordBody(BaseModel):
    otp: str
    new_password: str
    confirm_password: str


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordBody):
    email = body.email.strip().lower()
    if not email:
        raise ValidationError("Email is required", code="MISSING_EMAIL")

    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await user_repo.get_user_by_email(conn, email)

    if not user:
        # Return generic message to prevent account enumeration
        return {"message": "If that email exists, a 6-digit verification code has been sent."}

    otp_code = f"{random.randint(100000, 999999)}"
    redis_key = f"otp:reset:{email}"
    await redis_service.set_val(redis_key, otp_code, ttl_seconds=600)

    await email_service.send_otp_email(email, otp_code)
    return {"message": "If that email exists, a 6-digit verification code has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordBody):
    if body.new_password != body.confirm_password:
        raise ValidationError("Passwords do not match", code="PASSWORD_MISMATCH")

    email = body.email.strip().lower()
    otp = body.otp.strip()
    redis_key = f"otp:reset:{email}"

    stored = await redis_service.get_val(redis_key)
    if not stored or stored != otp:
        raise ValidationError("Invalid or expired verification code", code="INVALID_OTP")

    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await user_repo.get_user_by_email(conn, email)
        if not user:
            raise ValidationError("User not found", code="USER_NOT_FOUND")
        await user_repo.update_user_password(conn, user["id"], hash_password(body.new_password))

    await redis_service.delete_key(redis_key)
    return {"message": "Password updated successfully"}


@router.post("/send-change-otp")
async def send_change_otp(user=Depends(require_user)):
    user_id = user["id"]
    email = user["email"]

    otp_code = f"{random.randint(100000, 999999)}"
    redis_key = f"otp:change:{user_id}"

    await redis_service.set_val(redis_key, otp_code, ttl_seconds=600)
    success, msg = await email_service.send_otp_email(email, otp_code)
    return {"success": success, "message": msg}


@router.post("/change-password")
async def change_password(body: ChangePasswordBody, user=Depends(require_user)):
    if body.new_password != body.confirm_password:
        raise ValidationError("Passwords do not match", code="PASSWORD_MISMATCH")

    user_id = user["id"]
    otp = body.otp.strip()
    redis_key = f"otp:change:{user_id}"

    stored = await redis_service.get_val(redis_key)
    if not stored or stored != otp:
        raise ValidationError("Invalid or expired verification code", code="INVALID_OTP")

    pool = await get_pool()
    async with pool.acquire() as conn:
        await user_repo.update_user_password(conn, user_id, hash_password(body.new_password))

    await redis_service.delete_key(redis_key)
    return {"message": "Password changed successfully"}


@router.post("/signup", status_code=201)
async def signup(body: SignupBody):
    if body.password != body.confirm_password:
        raise ValidationError("Passwords do not match", code="PASSWORD_MISMATCH")

    pool = await get_pool()
    try:
        async with pool.acquire() as conn:
            await user_repo.create_user(conn, body.email, hash_password(body.password))
    except asyncpg.UniqueViolationError:
        raise ConflictError("An account with that email already exists", code="EMAIL_ALREADY_EXISTS")

    return {"message": "Account created - please sign in"}


@router.get("/me")
async def me(user=Depends(require_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        cnt = await account_repo.count_accounts_for_user(conn, user["id"])
    return {"id": user["id"], "email": user["email"], "onboarded": cnt > 0}
