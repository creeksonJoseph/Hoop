"""
ws_manager.py — Shared WebSocket connection manager
=====================================================
LAYER: Infrastructure (used by Routers and the poll task)

Manages two namespaces:
  - admin[ig_username]  : admin chat screens
  - wingman[token]      : public wingman views
"""
import asyncio
import json
from typing import Dict, List

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.admin: Dict[str, List[WebSocket]] = {}
        self.wingman: Dict[str, List[WebSocket]] = {}

    # ── Connect / disconnect ───────────────────────────────────────────────────

    async def connect_admin(self, ws: WebSocket, ig_username: str):
        await ws.accept()
        self.admin.setdefault(ig_username, []).append(ws)

    async def connect_wingman(self, ws: WebSocket, token: str):
        await ws.accept()
        self.wingman.setdefault(token, []).append(ws)

    def disconnect_admin(self, ws: WebSocket, ig_username: str):
        lst = self.admin.get(ig_username, [])
        if ws in lst:
            lst.remove(ws)

    def disconnect_wingman(self, ws: WebSocket, token: str):
        lst = self.wingman.get(token, [])
        if ws in lst:
            lst.remove(ws)

    # ── Broadcast helpers ──────────────────────────────────────────────────────

    async def _send_all(self, sockets: List[WebSocket], payload: dict):
        dead = []
        for ws in sockets:
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(ws)
        for ws in dead:
            if ws in sockets:
                sockets.remove(ws)

    async def broadcast_to_admin(self, ig_username: str, payload: dict):
        await self._send_all(self.admin.get(ig_username, []), payload)

    async def broadcast_to_wingman(self, token: str, payload: dict):
        await self._send_all(self.wingman.get(token, []), payload)

    async def broadcast_to_all_ig(self, ig_username: str, payload: dict, active_tokens: List[str]):
        """Push to admin + all non-revoked wingman sessions for an ig_username."""
        await self.broadcast_to_admin(ig_username, payload)
        for token in active_tokens:
            await self.broadcast_to_wingman(token, payload)

    def has_listeners(self, ig_username: str, active_tokens: List[str]) -> bool:
        if self.admin.get(ig_username):
            return True
        return any(self.wingman.get(t) for t in active_tokens)


# Singleton — imported everywhere
manager = ConnectionManager()
