"""
services/zernio/conversations.py
==================================
LAYER: Service — Zernio inbox/conversation operations.
Handles searching conversations, fetching messages, sending replies,
and deleting messages.
"""
import logging
from typing import Optional

from crypto import decrypt_api_key
from . import client


def _conv_matches(conv: dict, target: str) -> bool:
    """Check all possible username/name fields Zernio may return."""
    fields = [
        conv.get("participantName"),
        conv.get("participantId"),
        conv.get("participantUsername"),
        (conv.get("instagramProfile") or {}).get("username"),
        (conv.get("instagramProfile") or {}).get("name"),
        conv.get("username"),
        conv.get("name"),
    ]
    return target in [str(f).lower().lstrip("@") for f in fields if f]


async def find_conversation(
    ig_username: str,
    account_id: str,
    encrypted_key: str,
) -> Optional[dict]:
    """
    Find a conversation by Instagram username.
    First tries a direct search query param, then falls back to pagination.
    """
    raw_key = decrypt_api_key(encrypted_key)
    target = ig_username.lower().strip().lstrip("@")

    try:
        # Try search param first — avoids paginating 2000+ conversations
        for search_param in ("search", "query", "username", "participantUsername"):
            try:
                data = await client.get(
                    "/inbox/conversations",
                    {"platform": "instagram", "accountId": account_id, "limit": 50, search_param: target},
                    raw_key,
                )
                for conv in data.get("data", []):
                    if _conv_matches(conv, target):
                        logging.info(f"[find_conversation] found via {search_param}={target}")
                        return conv
            except Exception:
                pass

        # Full pagination fallback
        cursor = None
        page = 0
        while True:
            params = {"platform": "instagram", "accountId": account_id, "limit": 50}
            if cursor:
                params["cursor"] = cursor
            data = await client.get("/inbox/conversations", params, raw_key)
            convs = data.get("data", [])
            if page == 0 and convs:
                logging.info(f"[find_conversation] sample conv keys: {list(convs[0].keys())}")
                logging.info(f"[find_conversation] sample conv: {convs[0]}")
            for conv in convs:
                if _conv_matches(conv, target):
                    return conv
            pagination = data.get("pagination", {})
            if not pagination.get("hasMore"):
                break
            cursor = pagination.get("nextCursor")
            if not cursor:
                break
            page += 1
    finally:
        raw_key = ""

    logging.warning(f"[find_conversation] no match found for target={target}")
    return None


async def get_messages(
    conv_id: str,
    account_id: str,
    encrypted_key: str,
    *,
    limit: int = 50,
    sort: str = "asc",
    cursor: Optional[str] = None,
) -> dict:
    """Fetch messages for a conversation from Zernio."""
    raw_key = decrypt_api_key(encrypted_key)
    params = {"accountId": account_id, "limit": limit, "sortOrder": sort}
    if cursor:
        params["cursor"] = cursor
    try:
        return await client.get(f"/inbox/conversations/{conv_id}/messages", params, raw_key)
    finally:
        raw_key = ""


async def send_message(
    conv_id: str,
    account_id: str,
    encrypted_key: str,
    message: str,
) -> dict:
    """Send a message in a conversation via Zernio."""
    raw_key = decrypt_api_key(encrypted_key)
    try:
        return await client.post(
            f"/inbox/conversations/{conv_id}/messages",
            {"accountId": account_id, "message": message},
            raw_key,
        )
    finally:
        raw_key = ""


async def delete_message(msg_id: str, encrypted_key: str) -> dict:
    """
    Attempt to delete a message via Zernio.
    Raises httpx.HTTPStatusError if not supported (404/405).
    """
    raw_key = decrypt_api_key(encrypted_key)
    try:
        return await client.delete(f"/inbox/messages/{msg_id}", raw_key)
    finally:
        raw_key = ""
