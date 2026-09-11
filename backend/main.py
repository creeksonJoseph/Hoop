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
from fastapi.responses import JSONResponse

import sys
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

from config import FRONTEND_URL, ZERNIO_WEBHOOK_SECRET
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


# ── Global exception handler (ensures CORS headers survive a 500) ─────────────

@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all so unhandled errors still return JSON with CORS headers."""
    import traceback, logging
    err_str = str(exc)
    logging.error("Unhandled exception: %s", traceback.format_exc())
    origin = request.headers.get("origin") or "*"
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal error: {err_str}" if err_str else "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": origin if origin != "*" else "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
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


from repositories import account_repo


# ── Zernio inbound webhook ────────────────────────────────────────────────────

@app.post("/webhook/zernio", tags=["Webhook"])
async def zernio_webhook(request: Request):
    """
    Receives inbound events (messages, account.connected) from Zernio.
    """
    import logging

    # Validate webhook secret if configured
    if ZERNIO_WEBHOOK_SECRET:
        token = (
            request.headers.get("x-zernio-secret")
            or request.headers.get("x-webhook-secret")
            or request.headers.get("authorization", "").removeprefix("Bearer ")
        )
        if token != ZERNIO_WEBHOOK_SECRET:
            raise HTTPException(401, "Invalid webhook secret")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON payload")

    logging.info(f"[zernio_webhook] received payload: {payload}")

    event_type = payload.get("event")
    if event_type == "account.connected":
        acc = payload.get("account") or payload.get("data") or {}
        username = acc.get("username")
        account_id = acc.get("accountId") or acc.get("_id")
        if username and account_id:
            pool = await get_pool()
            async with pool.acquire() as conn:
                pending = await conn.fetchrow(
                    "SELECT user_id, zernio_api_key_enc FROM connected_ig_accounts WHERE ig_username = '__pending__' ORDER BY added_at DESC LIMIT 1"
                )
                if pending:
                    await account_repo.upsert_account(
                        conn, pending["user_id"], username, account_id, pending["zernio_api_key_enc"]
                    )
        return {"status": "ok", "event": "account.connected"}

    # Zernio webhook shape (message.received):
    #   payload.message = { id, conversationId, platformMessageId, text, sentAt, direction, sender: {id, name, username}, attachments }
    #   payload.conversation = { id, platformConversationId, participantId, participantName, participantUsername, ... }
    # conv_id MUST come from conversation.id (Zernio internal) — never from message.conversationId
    # which may be platformConversationId (Instagram's ID) and won't match what the REST API returns.
    msg  = payload.get("message") or {}
    conv = payload.get("conversation") or {}

    msg_id  = msg.get("id")
    conv_id = conv.get("id")

    direction   = msg.get("direction") or ("incoming" if event_type in ("message.received", "inbound") else "outgoing")
    text        = msg.get("text") or msg.get("message") or msg.get("body") or msg.get("content") or ""
    sender      = msg.get("sender") or {}
    sender_id   = sender.get("id")
    sender_name = sender.get("name") or sender.get("username") or conv.get("participantName")

    # sentAt is the confirmed Zernio timestamp field; fall back gracefully
    raw_ts = msg.get("sentAt") or msg.get("createdAt") or msg.get("created_at") or msg.get("timestamp")
    if isinstance(raw_ts, (int, float)):
        ts_sec = raw_ts / 1000 if raw_ts > 1e10 else raw_ts
        created_at = str(int(ts_sec))
    else:
        created_at = raw_ts  # already a string or None

    if not msg_id or not conv_id:
        logging.warning(f"[zernio_webhook] Ignored missing ids: msg_id={msg_id}, conv_id={conv_id}")
        return {"status": "ignored", "reason": "missing id or conversationId"}

    pool = await get_pool()
    async with pool.acquire() as conn:
        # conv_id from webhook is Instagram's platformConversationId (numeric).
        # Look up the Zernio internal ID so it matches what the frontend subscribes to.
        mapped = await conn.fetchval(
            "SELECT zernio_conv_id FROM conv_id_map WHERE platform_conv_id = $1",
            str(conv_id),
        )
        zernio_conv_id = mapped or str(conv_id)
        logging.info(f"[zernio_webhook] inserting msg_id={msg_id} platform_conv_id={conv_id} zernio_conv_id={zernio_conv_id} direction={direction}")
        await conn.execute(
            """
            INSERT INTO messages
                (id, conversation_id, sender_id, sender_name, message, direction, created_at, platform)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT (id) DO NOTHING
            """,
            str(msg_id), zernio_conv_id, sender_id, sender_name,
            text, direction, created_at, "instagram",
        )

    return {"status": "ok"}


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "version": "4.0.0"}
