"""
api/routers/chat/__init__.py
==============================
Assembles the chat router from its endpoint sub-modules.

main.py imports:  from api.routers import chat
and then uses:    chat.router

This file stitches together the GET /messages and POST /messages/reply
endpoints without containing any business logic.
"""
from fastapi import APIRouter
from .messages import router as _messages_router
from .reply import router as _reply_router

router = APIRouter(prefix="/messages", tags=["Messages"])
router.include_router(_messages_router)
router.include_router(_reply_router)
