# Hoop — Architecture & AI Guidance Document

> **Notice for Future LLMs & Developers**: This document details the core architectural principles, layer boundaries, and key design decisions of **Hoop**. **You MUST adhere strictly to these patterns when modifying or adding features.**

---

## 1. Core Architectural Philosophy

Hoop follows a strict separation of concerns on both the backend and frontend:

1. **Backend**: **Layered Architecture (Router → Service → Repository → Model)**. Each layer has a single responsibility. Modifying one layer must never break another.
2. **Frontend**: **FastAPI + Jinja2 + HTMX + TailwindCSS CDN**. No React, no npm, no build step. The backend is king — HTMX handles all dynamic interactions by swapping HTML fragments. Alpine.js is permitted for pure client-side transient UI state (e.g. mobile menus, dropdown open/close) that requires zero server round-trips.
3. **API Key Security (BYOK)**: Users bring their own Zernio API keys. These are **encrypted at rest** using Fernet (AES-128-CBC + HMAC). The raw key is never stored in plaintext and is never sent back to the frontend. All Zernio calls are proxied through the backend with in-memory decryption.

---

## 2. Backend Architecture (Layered Approach)

```
[ HTTP Request ]
       │
       ▼
┌──────────────┐  - HTTP parsing, route endpoints, query/body validation
│ Router Layer │  - NO business logic, NO direct SQL queries
└──────┬───────┘  - Lives in: backend/api/routers/
       │
       ▼
┌──────────────┐  - Business rules, validation, orchestration, Zernio proxying
│ Service Layer│  - NO FastAPI Request objects or HTTP status codes
└──────┬───────┘  - Lives in: backend/services/
       │
       ▼
┌──────────────┐  - Raw database operations: SELECT, INSERT, UPDATE, DELETE
│ Repo Layer   │  - Interacts directly with asyncpg pool
└──────┬───────┘  - Lives in: backend/repositories/
       │
       ▼
┌──────────────┐  - SQL schema definitions & DB migrations (table structures)
│ Schema/DB    │  - Lives in: backend/db.py (init_db, get_pool)
└──────────────┘
```

### Layer Rules & Boundaries

#### A. Routers (`backend/api/routers/`)
- **Role**: Define FastAPI endpoint routes, handle HTTP request/response payloads, parse path/query params, and return `HTMLResponse` / `JSONResponse` / `RedirectResponse`.
- **Rule**: Never execute direct SQL queries or business logic inside a router. Route handlers **must** delegate immediately to a service function.
- **HTMX Rule**: Endpoints that handle HTMX requests return **only the specific HTML fragment** that needs swapping — never a full `<html>` document.
- Files: `auth.py`, `home.py`, `chat.py`, `sessions.py`, `wingman.py`, `onboarding.py`

#### B. Services (`backend/services/`)
- **Role**: Core business logic, Zernio API proxying, encryption/decryption of API keys, wingman token generation, session permission checks.
- **Rule**: Services accept standard Python types. They **MUST NOT** depend on FastAPI `Request` objects or route-level dependencies. This keeps them reusable and testable.
- Files: `auth_service.py`, `zernio_service.py`, `session_service.py`, `message_service.py`

#### C. Repositories (`backend/repositories/`)
- **Role**: Direct database interaction layer (asyncpg pool). Contains functions for querying, creating, updating, or deleting records.
- **Rule**: Repositories must remain purely focused on database persistence. No Zernio calls, no business logic.
- Files: `user_repo.py`, `account_repo.py`, `session_repo.py`, `message_repo.py`

#### D. DB / Schema (`backend/db.py`)
- **Role**: Async connection pool, `init_db()` (CREATE TABLE IF NOT EXISTS for all tables), `get_pool()` helper.

---

## 3. API Key Security (BYOK — Bring Your Own Key)

### Storage Rule (MUST be followed)
- Zernio API keys are **NEVER** stored in plaintext in the database.
- On ingestion (onboarding / settings update): the raw key is encrypted with `cryptography.fernet.Fernet` using `APP_MASTER_KEY` from env.
- The resulting cipher string is stored in `connected_ig_accounts.zernio_api_key_enc`.
- The `APP_MASTER_KEY` lives only in environment variables — **never in code or DB**.

### Usage Rule (MUST be followed)
- When the backend needs to call Zernio: fetch the cipher from DB, decrypt it in-memory, inject directly into the `Authorization: Bearer` header, then discard.
- The raw key is **never** returned to the frontend.
- In any Settings UI: return only a masked version: `sk_****...{last4}`.

### Environment Variables Required
```
APP_MASTER_KEY=   # 32-byte Fernet key (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
JWT_SECRET=       # 64 hex chars
WINGMAN_SECRET=   # 64 hex chars
DATABASE_URL=     # PostgreSQL connection string
```

---

## 4. HTMX Best Practices (MUST follow)

1. **HTML Fragments Only**: Never return a full `<html>` document from an HTMX request. Return only the DOM snippet to be swapped.
2. **Forms over Attribute Soup**: If multiple inputs relate to one action, group them in a `<form>` and trigger from the form submission — don't slap `hx-post` on every input.
3. **Client-side UI state**: Use Alpine.js (or vanilla JS) for transient UI (open/close modals, menu toggles). Reserve HTMX for server-required interactions.
4. **hx-sync on Forms**: Use `hx-sync="this:drop"` on frequently-triggered forms to prevent duplicate submissions from rapid clicks.
5. **OOB Swaps for Multi-area Updates**: When one action must update disparate parts of the page (e.g., a toast + a list), use `hx-swap-oob` or push a redirect.
6. **XSS Prevention**: Jinja2's auto-escaping is always on. Never use `| safe` on user-generated text.

---

## 5. Skeleton UI (Mandatory)

**Every page that fetches data MUST have a skeleton UI** instead of a generic spinner. Skeleton UIs mimic the layout of the real content using pulsing grey placeholder blocks.

- Skeleton components live in `templates/partials/skeletons/`.
- Shown immediately while HTMX loads the real content.
- Replaced in-place by the real fragment once data arrives.

```html
<!-- Example skeleton card -->
<div class="animate-pulse bg-surface2 rounded-xl2 px-5 py-4 h-16"></div>
```

---

## 6. Guidelines for Future LLMs & Developers

- **Maintain Backend Layering**: Never query the database inside router files. Always: Router → Service → Repository.
- **Never Store Raw API Keys**: Always encrypt with Fernet before persisting. Always decrypt in-memory at usage time.
- **Preserve Compatibility**: When updating services or endpoints, preserve existing return contracts and optional parameter fallbacks.
- **No Blocking Operations**: All database and Zernio HTTP calls must remain async.
- **Skeleton UIs are Mandatory**: Every new data-driven page must ship with a skeleton.
- **HTMX Fragment Discipline**: Partial endpoints return fragments. Page endpoints return full templates. Never mix.