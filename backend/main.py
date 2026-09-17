"""
main.py - Hoop Application Entry Point
========================================
FastAPI REST API - no WebSocket server, no poll loop.
Real-time is handled by Supabase Realtime on the frontend.

Architecture (see Architecture.md):
  Router → Service → Repository → DB (Supabase PostgreSQL)
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import sys
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

import logging

from config import FRONTEND_URL
from db import get_pool, init_db

from api.routers import auth, home, chat, sessions, wingman, onboarding, admin, settings, webhook


# ── App lifecycle ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    pool = await get_pool()
    await pool.close()


# ── App creation ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="Hoop - IG DM Manager",
    description="View and reply to Instagram DMs via Zernio. Multi-user, BYOK.",
    version="4.0.0",
    lifespan=lifespan,
)

_ALLOWED_ORIGINS = list(dict.fromkeys(filter(None, [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://frontend-eight-inky-38.vercel.app",
    FRONTEND_URL,
])))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from api.errors import register_exception_handlers

register_exception_handlers(app)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,       prefix="/api")
app.include_router(home.router,       prefix="/api")
app.include_router(chat.router,       prefix="/api")
app.include_router(sessions.router,   prefix="/api")
app.include_router(wingman.router,    prefix="/api")
app.include_router(onboarding.router, prefix="/api")
app.include_router(admin.router,      prefix="/api")
app.include_router(settings.router,   prefix="/api")
app.include_router(webhook.router)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "version": "4.0.0"}
