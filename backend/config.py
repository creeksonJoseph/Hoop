"""
config.py — Central configuration & environment variable loading
================================================================
All env vars are read once here and imported by all other modules.
"""
import os
import pathlib
import secrets
from dotenv import load_dotenv

_ENV_PATH = pathlib.Path(__file__).parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

# ── Zernio API ────────────────────────────────────────────────────────────────
ZERNIO_BASE: str = "https://zernio.com/api/v1"

# ── Database (Supabase PostgreSQL) ────────────────────────────────────────────
DATABASE_URL: str = os.getenv("DATABASE_URL", "")
# Supabase requires SSL
if DATABASE_URL and "sslmode" not in DATABASE_URL:
    sep = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL += f"{sep}sslmode=require"

# ── Supabase Realtime ─────────────────────────────────────────────────────────
SUPABASE_URL: str         = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

from cryptography.fernet import Fernet

# ── Security ──────────────────────────────────────────────────────────────────
JWT_SECRET: str     = os.getenv("JWT_SECRET", "hoop-jwt-default-production-fallback-key-2026")
JWT_ALGORITHM       = "HS256"
JWT_EXPIRE_HOURS    = 72
WINGMAN_SECRET: str = os.getenv("WINGMAN_SECRET", "hoop-wingman-default-production-fallback-key-2026")
ZERNIO_WEBHOOK_SECRET: str = os.getenv("ZERNIO_WEBHOOK_SECRET", "")

APP_MASTER_KEY: str = os.getenv("APP_MASTER_KEY", "")
if not APP_MASTER_KEY:
    APP_MASTER_KEY = Fernet.generate_key().decode()

# ── App ───────────────────────────────────────────────────────────────────────
PORT: int         = int(os.getenv("PORT", "8000"))
APP_BASE_URL: str = os.getenv("APP_BASE_URL", "http://localhost:8000")
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://frontend-eight-inky-38.vercel.app")

# ── Startup validation ────────────────────────────────────────────────────────
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required.")
