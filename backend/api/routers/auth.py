"""
api/routers/auth.py
====================
LAYER: Router - REST endpoints for authentication.
Focuses strictly on HTTP handling, schema validation, and delegation to Service Layer.
All responses are JSON.
"""
import secrets
import asyncpg
from fastapi import APIRouter, Depends

from db import get_pool
from dependencies import require_user
from repositories import user_repo, account_repo
from services.auth_service import (
    create_jwt,
    hash_password,
    verify_password,
    create_signup_token,
    verify_signup_token,
)
from services import google_service, otp_service
from api.schemas.auth import (
    LoginBody,
    SignupBody,
    GoogleLoginBody,
    SignupSendOtpBody,
    SignupVerifyOtpBody,
    SignupCompleteBody,
    VerifyOTPBody,
    ForgotPasswordBody,
    ResetPasswordBody,
    ChangePasswordBody,
)
from api.errors import AuthenticationError, ValidationError, ConflictError

router = APIRouter(prefix="/auth", tags=["Auth"])


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
@router.post("/signup/send-otp")
async def send_otp(body: SignupSendOtpBody):
    email = body.email.strip().lower()
    if not email:
        raise ValidationError("Email is required", code="MISSING_EMAIL")

    pool = await get_pool()
    async with pool.acquire() as conn:
        existing = await user_repo.get_user_by_email(conn, email)
    
    if existing:
        raise ConflictError("An account with that email already exists", code="EMAIL_ALREADY_EXISTS")

    success, message = await otp_service.send_signup_otp(email)
    return {"success": success, "message": message}


@router.post("/signup/verify-otp")
async def signup_verify_otp(body: SignupVerifyOtpBody):
    email = body.email.strip().lower()
    valid = await otp_service.verify_signup_otp(email, body.otp)
    if not valid:
        raise ValidationError("Invalid or expired verification code", code="INVALID_OTP")

    signup_token = create_signup_token(email)
    return {"signup_token": signup_token}


@router.post("/signup/complete", status_code=201)
async def signup_complete(body: SignupCompleteBody):
    if body.password != body.confirm_password:
        raise ValidationError("Passwords do not match", code="PASSWORD_MISMATCH")

    if len(body.password) < 8:
        raise ValidationError("Password must be at least 8 characters", code="PASSWORD_TOO_SHORT")

    email = verify_signup_token(body.signup_token)
    if not email:
        raise ValidationError("Invalid or expired signup token. Please start again.", code="INVALID_SIGNUP_TOKEN")

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


@router.post("/verify-otp", status_code=201)
async def verify_otp(body: VerifyOTPBody):
    if body.password != body.confirm_password:
        raise ValidationError("Passwords do not match", code="PASSWORD_MISMATCH")

    email = body.email.strip().lower()
    valid = await otp_service.verify_signup_otp(email, body.code)
    if not valid:
        raise ValidationError("Invalid or expired verification code", code="INVALID_OTP")

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


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordBody):
    email = body.email.strip().lower()
    if not email:
        raise ValidationError("Email is required", code="MISSING_EMAIL")

    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await user_repo.get_user_by_email(conn, email)

    if not user:
        return {"message": "If that email exists, a 6-digit verification code has been sent."}

    await otp_service.send_reset_otp(email)
    return {"message": "If that email exists, a 6-digit verification code has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordBody):
    if body.new_password != body.confirm_password:
        raise ValidationError("Passwords do not match", code="PASSWORD_MISMATCH")

    email = body.email.strip().lower()
    valid = await otp_service.verify_reset_otp(email, body.otp)
    if not valid:
        raise ValidationError("Invalid or expired verification code", code="INVALID_OTP")

    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await user_repo.get_user_by_email(conn, email)
        if not user:
            raise ValidationError("User not found", code="USER_NOT_FOUND")
        await user_repo.update_user_password(conn, user["id"], hash_password(body.new_password))

    return {"message": "Password updated successfully"}


@router.post("/send-change-otp")
async def send_change_otp(user=Depends(require_user)):
    user_id = user["id"]
    email = user["email"]

    success, msg = await otp_service.send_change_otp(user_id, email)
    return {"success": success, "message": msg}


@router.post("/change-password")
async def change_password(body: ChangePasswordBody, user=Depends(require_user)):
    if body.new_password != body.confirm_password:
        raise ValidationError("Passwords do not match", code="PASSWORD_MISMATCH")

    user_id = user["id"]
    valid = await otp_service.verify_change_otp(user_id, body.otp)
    if not valid:
        raise ValidationError("Invalid or expired verification code", code="INVALID_OTP")

    pool = await get_pool()
    async with pool.acquire() as conn:
        await user_repo.update_user_password(conn, user_id, hash_password(body.new_password))

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
