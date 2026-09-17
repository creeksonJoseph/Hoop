"""
crypto.py - Fernet encryption/decryption for Zernio API keys
=============================================================
LAYER: Utility (used by Service layer only)

Rules (per Architecture.md):
- encrypt_api_key()  : call before any INSERT/UPDATE into the DB
- decrypt_api_key()  : call in-memory at Zernio call time, discard immediately
- mask_api_key()     : use in Settings UI - never return the raw or decrypted key
"""
import warnings

from cryptography.fernet import Fernet

from config import APP_MASTER_KEY

# Build the cipher once at startup - fails fast if key is malformed
try:
    _fernet = Fernet(APP_MASTER_KEY.encode())
except Exception as e:
    raise RuntimeError(
        f"APP_MASTER_KEY is invalid. "
        f"Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"\n"
        f"Original error: {e}"
    )


def encrypt_api_key(raw_key: str) -> str:
    """Encrypt a raw Zernio API key. Store the result in the DB."""
    return _fernet.encrypt(raw_key.encode()).decode()


def decrypt_api_key(encrypted: str) -> str:
    """
    Decrypt an encrypted Zernio API key for in-memory use.
    NEVER return this value to the frontend. Use immediately and discard.
    """
    return _fernet.decrypt(encrypted.encode()).decode()


def mask_api_key(raw_or_enc: str, *, already_decrypted: bool = False) -> str:
    """
    Return a masked version of the key for display in Settings UI.
    e.g.  sk_****...a8f3
    """
    try:
        raw = raw_or_enc if already_decrypted else decrypt_api_key(raw_or_enc)
    except Exception:
        raw = raw_or_enc  # fallback: mask whatever we got

    if len(raw) <= 8:
        return "sk_****"
    prefix = raw[:3]
    last4  = raw[-4:]
    return f"{prefix}_****...{last4}"
