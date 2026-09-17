"""
services/auth_service.py
=========================
LAYER: Service - authentication business logic.
No FastAPI Request objects. No HTTP status codes. Pure Python.
"""
import hashlib
import hmac
import time
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_HOURS, WINGMAN_SECRET

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_ctx.verify(plain, hashed)


def create_jwt(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None


# ── OAuth state token helpers ─────────────────────────────────────────────────

def make_oauth_state(user_id: int) -> str:
    """Return an HMAC-signed state token: '<user_id>.<timestamp>.<sig>'"""
    ts = int(time.time())
    msg = f"{user_id}.{ts}".encode()
    sig = hmac.new(WINGMAN_SECRET.encode(), msg, hashlib.sha256).hexdigest()[:16]
    return f"{user_id}.{ts}.{sig}"


def verify_oauth_state(state: str, max_age: int = 3600) -> Optional[int]:
    """Return user_id if the state token is valid and not expired, else None."""
    try:
        parts = state.split(".")
        if len(parts) != 3:
            return None
        user_id, ts, sig = int(parts[0]), int(parts[1]), parts[2]
        if time.time() - ts > max_age:
            return None
        msg = f"{user_id}.{ts}".encode()
        expected = hmac.new(WINGMAN_SECRET.encode(), msg, hashlib.sha256).hexdigest()[:16]
        if not hmac.compare_digest(sig, expected):
            return None
        return user_id
    except Exception:
        return None

