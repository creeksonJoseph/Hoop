"""
services/session_service.py
============================
LAYER: Service — wingman session business logic.
Generates HMAC tokens, validates access, orchestrates session CRUD.
No FastAPI Request. No raw SQL.
"""
import hashlib
import hmac
import secrets
from typing import Optional

from config import WINGMAN_SECRET


def make_wingman_token(wingman_name: str, ig_username: str) -> str:
    """
    Stable HMAC-SHA256 token — same inputs always produce the same token.
    This means re-generating a link for the same person regenerates
    the exact same link instead of creating a duplicate session.
    """
    raw = f"{wingman_name.lower().strip()}:{ig_username.lower().strip()}"
    return hmac.new(WINGMAN_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()


def new_session_id() -> str:
    return secrets.token_hex(8)


def validate_access_level(level: str) -> bool:
    return level in ("read", "send", "revoked")


def format_session_for_display(row: dict) -> dict:
    """Enrich a DB row dict with display-friendly fields."""
    return {
        **row,
        "token_preview": row["token"][:12],
        "created_at": str(row["created_at"]),
    }
