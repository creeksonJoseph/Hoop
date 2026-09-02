"""
main.py — Hoop Application Entry Point
========================================
FastAPI REST API + React Frontend

Architecture (see Architecture.md):
  Router → Service → Repository → DB

This file:
- Creates the FastAPI app
- Registers middleware (CORS)
- Mounts routers
- Starts/stops background tasks (poll loop)

No business logic, no SQL, no Zernio calls live here.
"""

import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

import sys
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

from config import JWT_SECRET
from db import get_pool, init_db
from ws_manager import manager
from repositories import account_repo, session_repo
from services import zernio_service

# ── Routers ───────────────────────────────────────────────────────────────────
from api.routers import auth, home, chat, sessions, wingman, onboarding, admin, settings

# ── Background poll task ──────────────────────────────────────────────────────

_latest_message_ids: dict = {}


async def poll_new_messages():
    """Poll Zernio every 5 s; push new messages to all WS clients."""
    while True:
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                accounts = await conn.fetch(
                    "SELECT DISTINCT ig_username, zernio_account_id, zernio_api_key_enc "
                    "FROM connected_ig_accounts"
                )

            for acc in accounts:
                ig_user = acc["ig_username"]
                acc_id = acc["zernio_account_id"]
                enc_key = acc["zernio_api_key_enc"]

                if enc_key is None:
                    continue

                pool2 = await get_pool()
                async with pool2.acquire() as conn:
                    active_tokens = await session_repo.get_active_tokens_for_ig(conn, ig_user)

                if not manager.has_listeners(ig_user, active_tokens):
                    continue

                try:
                    conv = await zernio_service.find_conversation(ig_user, acc_id, enc_key)
                    if not conv:
                        continue

                    data = await zernio_service.get_messages(
                        conv["id"], acc_id, enc_key, limit=5, sort="desc"
                    )
                    msgs = data.get("messages", [])
                    if not msgs:
                        continue

                    newest_id = msgs[0]["id"]
                    last_id = _latest_message_ids.get(ig_user)

                    if last_id is None:
                        _latest_message_ids[ig_user] = newest_id
                    elif newest_id != last_id:
                        new_msgs = []
                        for m in msgs:
                            if m["id"] == last_id:
                                break
                            new_msgs.append(m)
                        _latest_message_ids[ig_user] = newest_id
                        for m in reversed(new_msgs):
                            payload = {
                                "type": "new_message",
                                "message": {
                                    "id": m["id"],
                                    "message": m.get("message"),
                                    "direction": m.get("direction"),
                                    "sender_name": m.get("senderName"),
                                    "created_at": m.get("createdAt"),
                                    "attachments": m.get("attachments", []),
                                },
                            }
                            await manager.broadcast_to_all_ig(ig_user, payload, active_tokens)
                except Exception:
                    pass

        except Exception:
            pass
        await asyncio.sleep(5)


# ── App lifecycle ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    task = asyncio.create_task(poll_new_messages())
    yield
    task.cancel()
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
        os.getenv("FRONTEND_URL", "https://frontend-eight-inky-38.vercel.app"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")
app.include_router(home.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(wingman.router, prefix="/api")
app.include_router(onboarding.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(settings.router, prefix="/api")


# ── WebSocket endpoints ───────────────────────────────────────────────────────

@app.websocket("/ws/{ig_username}")
async def ws_admin(ws: WebSocket, ig_username: str):
    await manager.connect_admin(ws, ig_username)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_admin(ws, ig_username)


@app.websocket("/ws/view/{token}")
async def ws_wingman(ws: WebSocket, token: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        session = await session_repo.get_session_by_token(conn, token)
    if not session or session["access_level"] == "revoked":
        await ws.close(code=4003)
        return
    await manager.connect_wingman(ws, token)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_wingman(ws, token)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "version": "4.0.0"}
