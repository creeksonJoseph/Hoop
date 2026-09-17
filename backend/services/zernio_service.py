"""
services/zernio_service.py
===========================
COMPATIBILITY SHIM - do not add logic here.

This file exists only so that any direct import of:
    from services import zernio_service
still resolves. All real implementation has been moved into
the services/zernio/ sub-package.

To use specific functions, prefer importing directly from the sub-package:
    from services.zernio.conversations import find_conversation
    from services.zernio.accounts import get_accounts
"""
from services.zernio import (  # noqa: F401  re-export everything
    get_accounts,
    get_zernio_profile_id,
    get_connect_url,
    handle_oauth_callback,
    find_conversation,
    get_messages,
    send_message,
    delete_message,
)
