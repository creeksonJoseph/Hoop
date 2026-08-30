"""
Hoop Backend – Instagram DM viewer & replier via Zernio API
=============================================================
FastAPI + PostgreSQL (asyncpg) + static file serving
"""

import asyncio
import json
import os
from contextlib import asynccontextmanager
from typing import List, Optional

import asyncpg
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

# ─────────────────────────────── Config ───────────────────────────────────────
ZERNIO_API_KEY: str = os.getenv("ZERNIO_API_KEY", "")
ZERNIO_ACCOUNT_ID: str = os.getenv("ZERNIO_ACCOUNT_ID", "")
TARGET_IG_USERNAME: str = os.getenv("TARGET_IG_USERNAME", "itz_lore.en")
DATABASE_URL: str = os.getenv("DATABASE_URL", "")
ZERNIO_BASE = "https://zernio.com/api/v1"
PORT = int(os.getenv("PORT", "8000"))

# Static dir (hoop.html lives here)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

if not ZERNIO_API_KEY:
    raise RuntimeError("ZERNIO_API_KEY is not set.")
if not ZERNIO_ACCOUNT_ID:
    raise RuntimeError("ZERNIO_ACCOUNT_ID is not set.")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set.")

HEADERS = {
    "Authorization": f"Bearer {ZERNIO_API_KEY}",
    "Content-Type": "application/json",
}

# ──────────────────────────────── DB pool ─────────────────────────────────────
_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    return _pool


async def init_db():
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                conversation_id  TEXT PRIMARY KEY,
                participant_id   TEXT,
                participant_name TEXT,
                participant_username TEXT,
                last_message     TEXT,
                updated_time     TEXT,
                platform         TEXT DEFAULT 'instagram',
                fetched_at       TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id               TEXT PRIMARY KEY,
                conversation_id  TEXT NOT NULL,
                sender_id        TEXT,
                sender_name      TEXT,
                message          TEXT,
                direction        TEXT,
                created_at       TEXT,
                platform         TEXT DEFAULT 'instagram',
                cached_at        TIMESTAMPTZ DEFAULT NOW()
            )
        """)


# ─────────────────────────── Zernio HTTP helpers ──────────────────────────────
async def zernio_get(path: str, params: dict = None) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{ZERNIO_BASE}{path}", headers=HEADERS, params=params or {})
    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json()


async def zernio_post(path: str, body: dict) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{ZERNIO_BASE}{path}", headers=HEADERS, json=body)
    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json()


# ─────────────────────── Find target conversation ─────────────────────────────
async def find_target_conversation(username: Optional[str] = None) -> Optional[dict]:
    target = (username or TARGET_IG_USERNAME).lower().strip("@")
    cursor = None
    while True:
        params = {"platform": "instagram", "accountId": ZERNIO_ACCOUNT_ID, "limit": 50}
        if cursor:
            params["cursor"] = cursor
        data = await zernio_get("/inbox/conversations", params)
        for conv in data.get("data", []):
            pname  = (conv.get("participantName") or "").lower()
            pid    = (conv.get("participantId") or "").lower()
            puser  = (conv.get("participantUsername") or "").lower()
            ig_usr = ((conv.get("instagramProfile") or {}).get("username") or "").lower()
            if target in (pname, pid, puser, ig_usr):
                return conv
        pagination = data.get("pagination", {})
        if not pagination.get("hasMore"):
            break
        cursor = pagination.get("nextCursor")
    return None


def resolve_target(username: Optional[str]) -> str:
    if isinstance(username, str) and username.strip():
        return username
    return TARGET_IG_USERNAME


# ─────────────────────────── WebSocket Manager ────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, payload: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()
_latest_message_id: Optional[str] = None


async def poll_new_messages():
    """Poll Zernio every 5 s; push new messages to all WS clients."""
    global _latest_message_id
    while True:
        try:
            if manager.active:
                conv = await find_target_conversation(TARGET_IG_USERNAME)
                if conv:
                    data = await zernio_get(
                        f"/inbox/conversations/{conv['id']}/messages",
                        {"accountId": ZERNIO_ACCOUNT_ID, "limit": 5, "sortOrder": "desc"},
                    )
                    msgs = data.get("messages", [])
                    if msgs:
                        newest_id = msgs[0]["id"]
                        if _latest_message_id is None:
                            _latest_message_id = newest_id
                        elif newest_id != _latest_message_id:
                            new_msgs = []
                            for m in msgs:
                                if m["id"] == _latest_message_id:
                                    break
                                new_msgs.append(m)
                            _latest_message_id = newest_id
                            for m in reversed(new_msgs):
                                await manager.broadcast({
                                    "type": "new_message",
                                    "message": {
                                        "id": m["id"],
                                        "message": m.get("message"),
                                        "direction": m.get("direction"),
                                        "sender_name": m.get("senderName"),
                                        "created_at": m.get("createdAt"),
                                        "attachments": m.get("attachments", []),
                                    }
                                })
        except Exception:
            pass
        await asyncio.sleep(5)


# ─────────────────────────── App lifecycle ────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    task = asyncio.create_task(poll_new_messages())
    yield
    task.cancel()
    if _pool:
        await _pool.close()


app = FastAPI(
    title="Hoop – IG DM Manager",
    description="View and reply to Instagram DMs from a specific account via Zernio API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Serve static files (hoop.html etc.) ───────────────────────────────────────
if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# ─────────────────────────────── Schemas ──────────────────────────────────────
class ReplyBody(BaseModel):
    message: str


# ═══════════════════════════════ ROUTES ═══════════════════════════════════════

@app.get("/hoop.html", include_in_schema=False)
async def serve_ui():
    """Serve the chat UI."""
    path = os.path.join(STATIC_DIR, "hoop.html")
    if not os.path.isfile(path):
        raise HTTPException(404, "UI not found")
    return FileResponse(path, media_type="text/html")

@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "target_username": TARGET_IG_USERNAME}


@app.get("/accounts", tags=["Accounts"])
async def list_accounts():
    data = await zernio_get("/accounts", {"platform": "instagram"})
    accounts = data.get("accounts", [])
    return {
        "count": len(accounts),
        "accounts": [
            {"id": a.get("_id"), "username": a.get("username"),
             "platform": a.get("platform"), "profile_picture": a.get("profilePicture")}
            for a in accounts
        ],
    }


@app.get("/conversation", tags=["Conversation"])
async def get_target_conversation(
    username: str = Query(default=None, description="Override target username")
):
    target = resolve_target(username)
    conv = await find_target_conversation(target)
    if not conv:
        raise HTTPException(404, f"No conversation found with IG user: {target}")

    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO conversations
              (conversation_id, participant_id, participant_name, participant_username, last_message, updated_time)
            VALUES ($1,$2,$3,$4,$5,$6)
            ON CONFLICT (conversation_id) DO UPDATE SET
              last_message=EXCLUDED.last_message, updated_time=EXCLUDED.updated_time
        """,
            conv["id"], conv.get("participantId"), conv.get("participantName"),
            (conv.get("instagramProfile") or {}).get("username"),
            conv.get("lastMessage"), conv.get("updatedTime"),
        )

    return {
        "conversation_id": conv["id"],
        "participant_name": conv.get("participantName"),
        "participant_id": conv.get("participantId"),
        "instagram_username": (conv.get("instagramProfile") or {}).get("username"),
        "last_message": conv.get("lastMessage"),
        "updated_time": conv.get("updatedTime"),
        "unread_count": conv.get("unreadCount"),
        "url": conv.get("url"),
    }


@app.get("/messages", tags=["Messages"])
async def get_messages(
    username: str = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    sort: str = Query(default="asc"),
    cursor: Optional[str] = Query(default=None),
):
    target = resolve_target(username)
    conv = await find_target_conversation(target)
    if not conv:
        raise HTTPException(404, f"No conversation with: {target}")

    conv_id = conv["id"]
    sort_val = sort if isinstance(sort, str) and sort in ("asc", "desc") else "asc"
    limit_val = limit if isinstance(limit, int) else 50
    params = {"accountId": ZERNIO_ACCOUNT_ID, "limit": limit_val, "sortOrder": sort_val}
    if cursor and isinstance(cursor, str):
        params["cursor"] = cursor

    data = await zernio_get(f"/inbox/conversations/{conv_id}/messages", params)
    raw_messages = data.get("messages", [])

    pool = await get_pool()
    async with pool.acquire() as conn:
        for msg in raw_messages:
            await conn.execute("""
                INSERT INTO messages
                  (id, conversation_id, sender_id, sender_name, message, direction, created_at, platform)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                ON CONFLICT (id) DO NOTHING
            """,
                msg["id"], conv_id, msg.get("senderId"), msg.get("senderName"),
                msg.get("message"), msg.get("direction"), msg.get("createdAt"),
                msg.get("platform", "instagram"),
            )

    return {
        "conversation_id": conv_id,
        "participant_name": conv.get("participantName"),
        "instagram_username": (conv.get("instagramProfile") or {}).get("username"),
        "total_returned": len(raw_messages),
        "pagination": data.get("pagination"),
        "messages": [
            {
                "id": m["id"], "message": m.get("message"),
                "direction": m.get("direction"), "sender_name": m.get("senderName"),
                "created_at": m.get("createdAt"), "attachments": m.get("attachments", []),
                "is_story_reply": m.get("storyReply"),
            }
            for m in raw_messages
        ],
    }


@app.get("/messages/last", tags=["Messages"])
async def get_last_message(
    username: str = Query(default=None)
):
    target = resolve_target(username)
    conv = await find_target_conversation(target)
    if not conv:
        raise HTTPException(404, f"No conversation with: {target}")

    conv_id = conv["id"]
    data = await zernio_get(
        f"/inbox/conversations/{conv_id}/messages",
        {"accountId": ZERNIO_ACCOUNT_ID, "limit": 1, "sortOrder": "desc"},
    )
    messages = data.get("messages", [])
    if not messages:
        return {"last_message": None}
    last = messages[0]
    return {
        "conversation_id": conv_id,
        "participant_name": conv.get("participantName"),
        "instagram_username": (conv.get("instagramProfile") or {}).get("username"),
        "last_message": {
            "id": last["id"], "message": last.get("message"),
            "direction": last.get("direction"), "sender_name": last.get("senderName"),
            "created_at": last.get("createdAt"), "attachments": last.get("attachments", []),
        },
    }


@app.post("/messages/reply", tags=["Messages"])
async def reply_to_target(
    body: ReplyBody,
    username: str = Query(default=None),
):
    if not body.message.strip():
        raise HTTPException(400, "Message body cannot be empty.")
    target = resolve_target(username)
    conv = await find_target_conversation(target)
    if not conv:
        raise HTTPException(404, f"No conversation with: {target}")
    conv_id = conv["id"]
    result = await zernio_post(
        f"/inbox/conversations/{conv_id}/messages",
        {"accountId": ZERNIO_ACCOUNT_ID, "message": body.message},
    )
    return {"success": True, "conversation_id": conv_id,
            "participant_name": conv.get("participantName"),
            "sent_message": body.message, "zernio_response": result}


@app.get("/cache/messages", tags=["Cache"])
async def cached_messages(limit: int = Query(default=50, le=200)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM messages ORDER BY created_at DESC LIMIT $1", limit
        )
    return {"count": len(rows), "messages": [dict(r) for r in rows]}


@app.post("/conversation/read", tags=["Conversation"])
async def mark_read(username: str = Query(default=None)):
    target = resolve_target(username)
    conv = await find_target_conversation(target)
    if not conv:
        raise HTTPException(404, f"No conversation with: {target}")
    conv_id = conv["id"]
    result = await zernio_post(
        f"/inbox/conversations/{conv_id}/read",
        {"accountId": ZERNIO_ACCOUNT_ID},
    )
    return {"success": True, "conversation_id": conv_id, "result": result}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
