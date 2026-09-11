"""
api/routers/onboarding/__init__.py
=====================================
Assembles the onboarding router from its endpoint sub-modules.

main.py imports:  from api.routers import onboarding
and then uses:    onboarding.router
"""
from fastapi import APIRouter
from .connect import router as _connect_router
from .callback import router as _callback_router

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])
router.include_router(_connect_router)
router.include_router(_callback_router)
