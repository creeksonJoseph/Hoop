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

# ── Security ──────────────────────────────────────────────────────────────────
JWT_SECRET: str      = os.getenv("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM        = "HS256"
JWT_EXPIRE_HOURS     = 72
WINGMAN_SECRET: str  = os.getenv("WINGMAN_SECRET", secrets.token_hex(32))
APP_MASTER_KEY: str  = os.getenv("APP_MASTER_KEY", "")   # Fernet key — REQUIRED

# ── App ───────────────────────────────────────────────────────────────────────
PORT: int         = int(os.getenv("PORT", "8000"))
APP_BASE_URL: str = os.getenv("APP_BASE_URL", "http://localhost:8000")

# ── Directories ───────────────────────────────────────────────────────────────
import pathlib
_HERE        = pathlib.Path(__file__).parent
STATIC_DIR   = str(_HERE / "static")
TEMPLATE_DIR = str(_HERE / "templates")

# ── Startup validation ────────────────────────────────────────────────────────
_required = {
    "DATABASE_URL": DATABASE_URL,
    "APP_MASTER_KEY": APP_MASTER_KEY,
}
for _name, _val in _required.items():
    if not _val:
        raise RuntimeError(f"{_name} is not set in environment.")
