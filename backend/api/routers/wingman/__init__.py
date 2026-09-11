"""
api/routers/wingman/__init__.py
==================================
Assembles the wingman router from its endpoint sub-modules.

main.py imports:  from api.routers import wingman
and then uses:    wingman.router
"""
from fastapi import APIRouter
from .session import router as _session_router
from .messages import router as _messages_router
from .reply import router as _reply_router

router = APIRouter(prefix="/wingman", tags=["Wingman"])
router.include_router(_session_router)
router.include_router(_messages_router)
router.include_router(_reply_router)
