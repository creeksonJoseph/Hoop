"""
main.py — Hoop Application Entry Point
========================================
FastAPI REST API — no WebSocket server, no poll loop.
Real-time is handled by Supabase Realtime on the frontend.

Architecture (see Architecture.md):
  Router → Service → Repository → DB (Supabase PostgreSQL)
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

import sys
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

from config import FRONTEND_URL
from db import get_pool, init_db

from api.routers import auth, home, chat, sessions, wingman, onboarding, admin, settings


# ── App lifecycle ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    pool = await get_pool()
    await pool.close()


# ── App creation ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="Hoop – IG DM Manager",
    description="View and reply to Instagram DMs via Zernio. Multi-user, BYOK.",
    version="4.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://frontend-eight-inky-38.vercel.app",
        FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,       prefix="/api")
app.include_router(home.router,       prefix="/api")
app.include_router(chat.router,       prefix="/api")
app.include_router(sessions.router,   prefix="/api")
app.include_router(wingman.router,    prefix="/api")
app.include_router(onboarding.router, prefix="/api")
app.include_router(admin.router,      prefix="/api")
app.include_router(settings.router,   prefix="/api")


# ── Zernio inbound webhook ────────────────────────────────────────────────────

@app.post("/webhook/zernio", tags=["Webhook"])
async def zernio_webhook(request: Request):
    """
    Receives inbound message events from Zernio.
    Inserts the message into the messages table.
    Supabase Realtime broadcasts the INSERT to subscribed frontend clients.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON payload")

    msg = payload.get("message") or payload
    msg_id      = msg.get("id") or msg.get("messageId")
    conv_id     = msg.get("conversationId") or msg.get("conversation_id")
    direction   = msg.get("direction", "incoming")
    text        = msg.get("message") or msg.get("text") or msg.get("body")
    sender_id   = msg.get("senderId")
    sender_name = msg.get("senderName")
    created_at  = msg.get("createdAt") or msg.get("created_at")

    if not msg_id or not conv_id:
        return {"status": "ignored", "reason": "missing id or conversationId"}

    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO messages
                (id, conversation_id, sender_id, sender_name, message, direction, created_at, platform)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT (id) DO NOTHING
            """,
            msg_id, conv_id, sender_id, sender_name,
            text, direction, created_at, "instagram",
        )

    return {"status": "ok"}


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "version": "4.0.0"}
