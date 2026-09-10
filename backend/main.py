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
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON payload")

    import logging
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

    # Extract message data structure
    data = payload.get("data") or payload.get("message") or payload.get("payload") or payload
    if isinstance(data, dict) and "message" in data and isinstance(data["message"], dict):
        msg = data["message"]
    else:
        msg = data if isinstance(data, dict) else payload

    msg_id = msg.get("id") or msg.get("messageId") or msg.get("_id")
    conv = (payload.get("conversation") if isinstance(payload.get("conversation"), dict) else {}) or (msg.get("conversation") if isinstance(msg.get("conversation"), dict) else {})
    conv_id = (
        conv.get("id")
        or msg.get("conversationId")
        or msg.get("conversation_id")
        or payload.get("conversationId")
        or payload.get("conversation_id")
    )

    direction   = msg.get("direction") or ("incoming" if event_type in ("message.received", "inbound") else "outgoing")
    text        = msg.get("message") or msg.get("text") or msg.get("body") or msg.get("content") or ""
    sender_id   = msg.get("senderId") or (msg.get("sender") or {}).get("id")
    sender_name = msg.get("senderName") or (msg.get("sender") or {}).get("name") or (msg.get("sender") or {}).get("username")
    created_at  = msg.get("createdAt") or msg.get("created_at") or msg.get("timestamp")

    if not msg_id or not conv_id:
        logging.warning(f"[zernio_webhook] Ignored missing ids: msg_id={msg_id}, conv_id={conv_id}")
        return {"status": "ignored", "reason": "missing id or conversationId"}

    pool = await get_pool()
    async with pool.acquire() as conn:
        # Insert primary record
        await conn.execute(
            """
            INSERT INTO messages
                (id, conversation_id, sender_id, sender_name, message, direction, created_at, platform)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT (id) DO NOTHING
            """,
            str(msg_id), str(conv_id), sender_id, sender_name,
            text, direction, created_at, "instagram",
        )
        # If alternative conversation ID exists in payload, also insert for seamless matching
        alt_conv_id = conv.get("id") if (conv.get("id") and str(conv.get("id")) != str(conv_id)) else None
        if alt_conv_id:
            await conn.execute(
                """
                INSERT INTO messages
                    (id, conversation_id, sender_id, sender_name, message, direction, created_at, platform)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                ON CONFLICT (id) DO NOTHING
                """,
                f"{msg_id}_alt", str(alt_conv_id), sender_id, sender_name,
                text, direction, created_at, "instagram",
            )

    return {"status": "ok"}


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "version": "4.0.0"}
