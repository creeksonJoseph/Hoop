"""
api/routers/auth.py
====================
LAYER: Router — HTTP endpoints for authentication.
Delegates all logic to auth_service and user_repo.
"""
from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from db import get_pool
from dependencies import get_current_user
from repositories import user_repo
from services.auth_service import create_jwt, hash_password, verify_password

router = APIRouter()


def _render(request: Request, tpl: str, ctx: dict = None, status: int = 200) -> HTMLResponse:
    from main import templates
    flashed = request.session.pop("_flash", [])
    context = {"request": request, "get_flashed_messages": lambda with_categories=True: flashed}
    if ctx:
        context.update(ctx)
    return templates.TemplateResponse(tpl, context, status_code=status)


def _flash(request: Request, msg: str, cat: str = "info"):
    request.session.setdefault("_flash", []).append((cat, msg))


# ── Login ──────────────────────────────────────────────────────────────────────

@router.get("/auth/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return _render(request, "auth/login.html")


@router.post("/auth/login", response_class=HTMLResponse)
async def login(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await user_repo.get_user_by_email(conn, email)

    if not user or not verify_password(password, user["password_hash"]):
        _flash(request, "Invalid email or password", "error")
        return _render(request, "auth/login.html", status=401)

    token = create_jwt(user["id"], user["email"])
    resp  = RedirectResponse("/home", status_code=302)
    resp.set_cookie("hoop_token", token, httponly=True, samesite="lax", max_age=72 * 3600)
    return resp


# ── Signup ─────────────────────────────────────────────────────────────────────

@router.get("/auth/signup", response_class=HTMLResponse)
async def signup_page(request: Request):
    return _render(request, "auth/signup.html")


@router.post("/auth/signup", response_class=HTMLResponse)
async def signup(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
):
    import asyncpg
    if password != confirm_password:
        _flash(request, "Passwords do not match", "error")
        return _render(request, "auth/signup.html", status=400)

    pool = await get_pool()
    try:
        async with pool.acquire() as conn:
            await user_repo.create_user(conn, email, hash_password(password))
    except asyncpg.UniqueViolationError:
        _flash(request, "An account with that email already exists", "error")
        return _render(request, "auth/signup.html", status=400)

    _flash(request, "Account created — please sign in", "success")
    return RedirectResponse("/auth/login", status_code=302)


# ── Logout ─────────────────────────────────────────────────────────────────────

@router.post("/auth/logout")
async def logout():
    resp = RedirectResponse("/auth/login", status_code=302)
    resp.delete_cookie("hoop_token")
    return resp


# ── Root redirect ──────────────────────────────────────────────────────────────

@router.get("/", response_class=HTMLResponse)
async def index(request: Request, user=Depends(get_current_user)):
    if user:
        return RedirectResponse("/home", status_code=302)
    return _render(request, "auth/login.html")
