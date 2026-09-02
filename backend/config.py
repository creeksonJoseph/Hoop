"""
config.py — Central configuration & environment variable loading
================================================================
All env vars are read once here and imported by all other modules.
"""
import os
import pathlib
import secrets
from dotenv import load_dotenv

# Always load from the directory containing this file (backend/)
_ENV_PATH = pathlib.Path(__file__).parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

# ── Zernio API ────────────────────────────────────────────────────────────────
ZERNIO_BASE: str        = "https://zernio.com/api/v1"

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL: str = os.getenv("DATABASE_URL", "")

from cryptography.fernet import Fernet

# ── Security ──────────────────────────────────────────────────────────────────
JWT_SECRET: str      = os.getenv("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM        = "HS256"
JWT_EXPIRE_HOURS     = 72
WINGMAN_SECRET: str  = os.getenv("WINGMAN_SECRET", secrets.token_hex(32))

APP_MASTER_KEY: str  = os.getenv("APP_MASTER_KEY", "")
if not APP_MASTER_KEY:
    APP_MASTER_KEY = Fernet.generate_key().decode()

# ── App ───────────────────────────────────────────────────────────────────────
PORT: int         = int(os.getenv("PORT", "8000"))
APP_BASE_URL: str = os.getenv("APP_BASE_URL", "http://localhost:8000")

# ── Directories ───────────────────────────────────────────────────────────────
_HERE        = pathlib.Path(__file__).parent
STATIC_DIR   = str(_HERE / "static")
TEMPLATE_DIR = str(_HERE / "templates")

# ── Startup validation ────────────────────────────────────────────────────────
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required.")

