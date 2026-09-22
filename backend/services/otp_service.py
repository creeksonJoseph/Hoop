"""
services/otp_service.py
========================
LAYER: Service - OTP generation, Redis storage, and transactional email dispatch.
Handles OTP workflows for Signup verification, Password Reset, and Password Change.
"""
import random
import logging
from typing import Tuple
from services import redis_service, email_service

logger = logging.getLogger(__name__)


def generate_otp() -> str:
    """Generate a random 6-digit numeric OTP code string."""
    return f"{random.randint(100000, 999999)}"


async def send_signup_otp(email: str) -> Tuple[bool, str]:
    """Generate, store, and email a 6-digit OTP code for user signup."""
    normalized = email.strip().lower()
    otp_code = generate_otp()
    
    # Store OTP in Redis for 10 minutes (600 seconds)
    await redis_service.set_val(f"otp:signup:{normalized}", otp_code, ttl_seconds=600)
    await redis_service.set_val(f"otp:{normalized}", otp_code, ttl_seconds=600)

    success, msg = await email_service.send_otp_email(normalized, otp_code)
    return success, "Verification code sent. Check your inbox."


async def verify_signup_otp(email: str, otp: str) -> bool:
    """Verify and consume a signup OTP code from Redis."""
    normalized = email.strip().lower()
    clean_otp = otp.strip()

    stored_code = await redis_service.get_val(f"otp:signup:{normalized}")
    if not stored_code or stored_code != clean_otp:
        stored_code = await redis_service.get_val(f"otp:{normalized}")
        if not stored_code or stored_code != clean_otp:
            return False

    await redis_service.delete_key(f"otp:signup:{normalized}")
    await redis_service.delete_key(f"otp:{normalized}")
    return True


async def send_reset_otp(email: str) -> Tuple[bool, str]:
    """Generate, store, and email a 6-digit OTP code for password reset."""
    normalized = email.strip().lower()
    otp_code = generate_otp()

    await redis_service.set_val(f"otp:reset:{normalized}", otp_code, ttl_seconds=600)
    return await email_service.send_otp_email(normalized, otp_code)


async def verify_reset_otp(email: str, otp: str) -> bool:
    """Verify and consume a password reset OTP code from Redis."""
    normalized = email.strip().lower()
    clean_otp = otp.strip()
    redis_key = f"otp:reset:{normalized}"

    stored = await redis_service.get_val(redis_key)
    if not stored or stored != clean_otp:
        return False

    await redis_service.delete_key(redis_key)
    return True


async def send_change_otp(user_id: int, email: str) -> Tuple[bool, str]:
    """Generate, store, and email a 6-digit OTP code for changing account password."""
    otp_code = generate_otp()
    redis_key = f"otp:change:{user_id}"

    await redis_service.set_val(redis_key, otp_code, ttl_seconds=600)
    return await email_service.send_otp_email(email, otp_code)


async def verify_change_otp(user_id: int, otp: str) -> bool:
    """Verify and consume a password change OTP code from Redis."""
    clean_otp = otp.strip()
    redis_key = f"otp:change:{user_id}"

    stored = await redis_service.get_val(redis_key)
    if not stored or stored != clean_otp:
        return False

    await redis_service.delete_key(redis_key)
    return True
