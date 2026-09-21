"""
api/routers/chat/formatters.py
================================
LAYER: Router helpers - Pydantic schemas and pure helper functions for
extracting and formatting conversation / message data.
"""
import datetime
import re
from typing import Any, List, Optional, Tuple
from pydantic import BaseModel, Field


class MessageItem(BaseModel):
    """Pydantic schema representing a normalized DM message in API responses."""
    id: str
    message: Optional[str] = None
    direction: Optional[str] = None
    sender_name: Optional[str] = None
    created_at: Optional[str] = None
    attachments: List[Any] = Field(default_factory=list)

    @classmethod
    def from_db(cls, m: Any, fallback_sender: str) -> "MessageItem":
        """Construct MessageItem schema from an asyncpg DB record."""
        msg_text = m.get("message")
        return cls(
            id=str(m["id"]),
            message=msg_text,
            direction=m.get("direction"),
            sender_name=m.get("sender_name") or fallback_sender,
            created_at=m.get("created_at"),
            attachments=[],
        )

    @classmethod
    def from_zernio(cls, m: Any, fallback_sender: str) -> "MessageItem":
        """Construct MessageItem schema from a raw Zernio dict."""
        if isinstance(m, dict):
            sender = m.get("sender") or {}
            sender_name = (
                sender.get("name")
                or sender.get("username")
                or m.get("senderName")
                or m.get("sender_name")
                or fallback_sender
            )
            msg_text = m.get("text") or m.get("message")
            created_at = m.get("sentAt") or m.get("createdAt") or m.get("created_at")
            msg_id = m.get("id") or m.get("message_id")
            attachments = m.get("attachments") or []
            msg_type = (m.get("type") or "").lower()

            # Generate descriptive label if message text is blank/missing
            if not msg_text or not str(msg_text).strip():
                if "story" in msg_type or any("story" in str(a.get("type", "")).lower() for a in attachments):
                    msg_text = "Shared an Instagram Story"
                elif msg_type in ("image", "photo"):
                    msg_text = "Sent a photo"
                elif msg_type in ("video", "clip"):
                    msg_text = "Sent a video"
                elif msg_type in ("audio", "voice"):
                    msg_text = "Sent a voice message"
                elif msg_type == "sticker":
                    msg_text = "Sent a sticker"
        else:
            msg_id = m.get("id")
            msg_text = m.get("message")
            sender_name = m.get("sender_name") or fallback_sender
            created_at = m.get("created_at")
            attachments = []

        return cls(
            id=str(msg_id),
            message=msg_text,
            direction=m.get("direction") if isinstance(m, dict) else m.get("direction"),
            sender_name=sender_name,
            created_at=created_at,
            attachments=attachments,
        )


def _message_id(message: Any) -> Optional[str]:
    """Return the provider's canonical ID from a DB row or API payload."""
    if isinstance(message, dict):
        value = message.get("id") or message.get("message_id")
    else:
        value = message.get("id") or message.get("message_id")
    return str(value) if value is not None else None


def _message_value(message: Any, *names: str) -> Any:
    return next((message.get(name) for name in names if message.get(name) is not None), None)


def _message_timestamp(message: Any) -> Optional[datetime.datetime]:
    value = _message_value(message, "created_at", "createdAt", "sentAt", "timestamp")
    if isinstance(value, datetime.datetime):
        return value
    if value is None:
        return None
    try:
        return datetime.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _same_message_fingerprint(left: Any, right: Any) -> bool:
    if str(_message_value(left, "conversation_id", "conversationId") or "") != str(
        _message_value(right, "conversation_id", "conversationId") or ""
    ):
        return False
    if str(_message_value(left, "direction") or "") != str(_message_value(right, "direction") or ""):
        return False
    left_text = re.sub(r"\s+", " ", str(_message_value(left, "message", "text") or "").strip()).casefold()
    right_text = re.sub(r"\s+", " ", str(_message_value(right, "message", "text") or "").strip()).casefold()
    left_time = _message_timestamp(left)
    right_time = _message_timestamp(right)
    return bool(left_time and right_time and left_text == right_text and abs((left_time - right_time).total_seconds()) <= 2)


def _dedupe_messages(messages: list) -> list:
    """Keep one response item per ID or exact duplicate fingerprint."""
    unique = []
    seen = set()
    for message in messages:
        message_id = _message_id(message)
        if message_id in seen or any(_same_message_fingerprint(message, previous) for previous in unique):
            continue
        if message_id is not None:
            seen.add(message_id)
        unique.append(message)
    return unique



def extract_profile_data(conv: dict, fallback_username: str) -> Tuple[str, Optional[str]]:
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


def format_db_messages(messages: list, fallback_sender: str) -> List[dict]:
    """Normalise DB message records into Pydantic model dicts."""
    return [MessageItem.from_db(m, fallback_sender).model_dump() for m in _dedupe_messages(messages)]


def format_zernio_messages(messages: list, fallback_sender: str) -> List[dict]:
    """Normalise raw Zernio message dicts into Pydantic model dicts."""
    return [MessageItem.from_zernio(m, fallback_sender).model_dump() for m in _dedupe_messages(messages)]

