"""
api/routers/chat/formatters.py
================================
LAYER: Router helpers — pure functions for extracting and formatting
conversation / message data. No I/O, no FastAPI dependencies.
"""
from typing import Optional


def extract_profile_data(conv: dict, fallback_username: str) -> tuple[str, Optional[str]]:
    """
    Extract (display_name, avatar_url) from a Zernio conversation dict.
    Falls back gracefully so the UI never shows an empty name.
    """
    p_data = conv.get("instagramProfile") or conv.get("participant") or {}
    display_name = (
        p_data.get("name")
        or p_data.get("displayName")
        or p_data.get("full_name")
        or conv.get("participantName")
        or conv.get("name")
        or fallback_username
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
    return display_name, avatar_url


def format_db_messages(messages: list, fallback_sender: str) -> list:
    """
    Normalise DB message records into the standard API response shape.
    """
    return [
        {
            "id": m["id"],
            "message": m.get("message"),
            "direction": m.get("direction"),
            "sender_name": m.get("sender_name") or fallback_sender,
            "created_at": m.get("created_at"),
            "attachments": [],
        }
        for m in messages
    ]


def format_zernio_messages(messages: list, fallback_sender: str) -> list:
    """
    Normalise raw Zernio message dicts into the standard API response shape.
    Zernio may use different field names (text vs message, sentAt vs createdAt).
    """
    return [
        {
            "id": m["id"] if isinstance(m, dict) else m.get("id"),
            "message": (m.get("text") or m.get("message")) if isinstance(m, dict) else m.get("message"),
            "direction": m.get("direction"),
            "sender_name": (
                ((m.get("sender") or {}).get("name") or m.get("senderName") or m.get("sender_name"))
                if isinstance(m, dict)
                else (m.get("sender_name") or fallback_sender)
            ),
            "created_at": (
                (m.get("sentAt") or m.get("createdAt") or m.get("created_at"))
                if isinstance(m, dict)
                else m.get("created_at")
            ),
            "attachments": m.get("attachments", []) if isinstance(m, dict) else [],
        }
        for m in messages
    ]
