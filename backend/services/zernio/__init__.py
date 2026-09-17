"""
services/zernio/__init__.py
=============================
Re-exports all public functions from the zernio service sub-package.

Existing callers can continue to use:
    from services import zernio_service
    await zernio_service.find_conversation(...)

No behaviour changes - this is a pure structural reorganisation.
"""
from .accounts import (
    get_accounts,
    get_zernio_profile_id,
    get_connect_url,
    handle_oauth_callback,
)
from .conversations import (
    find_conversation,
    get_messages,
    send_message,
    delete_message,
)

__all__ = [
    "get_accounts",
    "get_zernio_profile_id",
    "get_connect_url",
    "handle_oauth_callback",
    "find_conversation",
    "get_messages",
    "send_message",
    "delete_message",
]
