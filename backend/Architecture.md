# Hoop — Architecture & AI Guidance Document

> **Notice for Future LLMs & Developers**: This document details the core architectural principles, layer boundaries, and key design decisions of **Hoop**. **You MUST adhere strictly to these patterns when modifying or adding features.**

---

## 1. Core Architectural Philosophy

Hoop follows a strict separation of concerns across both backend and frontend:

1. **Backend**: **Layered Architecture (Router → Service → Repository → Model)**. Each layer has a single responsibility. Routers return **JSON only** — no HTML, no redirects (except OAuth flows). The API is consumed exclusively by the React frontend.
2. **Frontend**: **Custom Hook Abstraction Pattern (Page/Component UI ↔ Custom Hook State)**. Pages and components are pure, presentational UI layers. All state, data fetching, business logic, and side-effects MUST be encapsulated inside dedicated custom hooks.
3. **API Key Security (BYOK)**: Users bring their own Zernio API keys. These are **encrypted at rest** using Fernet (AES-128-CBC + HMAC). The raw key is never stored in plaintext and is never sent back to the frontend. All Zernio calls are proxied through the backend with in-memory decryption.
4. **Auth**: JWT Bearer tokens. The frontend stores the token in `localStorage` and sends it via `Authorization: Bearer <token>` on every request using the Axios instance in `frontend/src/lib/api.js`.

---

## 2. Backend Architecture (Layered Approach)

```
[ HTTP Request ]
       │
       ▼
┌──────────────┐  - HTTP parsing, route endpoints, query/body validation
│ Router Layer │  - Returns JSON only (JSONResponse / dict)
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

### REST API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Login, returns JWT |
| POST | `/api/auth/signup` | — | Register new user |
| GET | `/api/auth/me` | Bearer | Current user info |
| GET | `/api/dms` | Bearer | List tracked DM conversations |
| POST | `/api/dms` | Bearer | Add a DM conversation |
| DELETE | `/api/dms/{ig_username}` | Bearer | Delete a DM conversation |
| GET | `/api/messages` | Bearer | Fetch messages for a conversation |
| POST | `/api/messages/reply` | Bearer | Send a message |
| GET | `/api/sessions/{ig_username}` | Bearer | List wingman sessions |
| POST | `/api/sessions/{ig_username}` | Bearer | Generate wingman session |
| PATCH | `/api/sessions/{session_id}` | Bearer | Update session access level |
| DELETE | `/api/sessions/{session_id}` | Bearer | Delete session |
| GET | `/api/settings` | Bearer | Get user settings |
| PUT | `/api/settings/api-key` | Bearer | Update Zernio API key |
| DELETE | `/api/settings/api-key` | Bearer | Disconnect account |
| POST | `/api/onboarding/connect` | Bearer | Connect Zernio API key |
| GET | `/api/onboarding/connect/instagram` | Bearer | Redirect to Meta OAuth |
| GET | `/api/onboarding/callback` | Bearer | OAuth callback handler |
| GET | `/api/wingman/{token}` | — | Public wingman session info |
| GET | `/api/wingman/{token}/messages` | — | Public wingman messages |
| POST | `/api/wingman/{token}/reply` | — | Public wingman reply |
| DELETE | `/api/admin/messages/{msg_id}` | Bearer | Delete a message |
| WS | `/ws/{ig_username}` | — | Admin real-time message stream |
| WS | `/ws/view/{token}` | — | Wingman real-time message stream |

### Layer Rules & Boundaries

#### A. Routers (`backend/api/routers/`)
- **Role**: Define FastAPI endpoint routes, parse path/query/body params, return JSON dicts or raise `HTTPException`.
- **Rule**: Never execute direct SQL queries or business logic inside a router. Route handlers **must** delegate immediately to a service function.
- **REST Rule**: All endpoints return JSON. No `HTMLResponse`, no `TemplateResponse`, no `RedirectResponse` (except OAuth redirect flows in onboarding).

#### B. Services (`backend/services/`)
- **Role**: Core business logic, Zernio API proxying, encryption/decryption of API keys, wingman token generation, session permission checks.
- **Rule**: Services accept standard Python types. They **MUST NOT** depend on FastAPI `Request` objects or route-level dependencies.

#### C. Repositories (`backend/repositories/`)
- **Role**: Direct database interaction layer (asyncpg pool). Contains functions for querying, creating, updating, or deleting records.
- **Rule**: Repositories must remain purely focused on database persistence. No Zernio calls, no business logic.

#### D. DB / Schema (`backend/db.py`)
- **Role**: Async connection pool, `init_db()` (CREATE TABLE IF NOT EXISTS for all tables), `get_pool()` helper.

---

## 3. Frontend Architecture (Hook-Driven UI)

```
┌─────────────────────────────────────────────────────────┐
│                    Pages & Components                   │
│   (e.g., HomePage.jsx, ChatPage.jsx, SettingsPage.jsx)  │
│  - Pure presentational JSX & Tailwind styling           │
│  - Receives state & handlers from custom hooks          │
└────────────────────────┬────────────────────────────────┘
                         │ Consumes hook
                         ▼
┌─────────────────────────────────────────────────────────┐
│                       Custom Hooks                      │
│   (e.g., useDMs.js, useChat.js, useSettings.js)         │
│  - Encapsulates useState, useEffect, Axios API calls    │
│  - Manages optimistic UI updates & WebSocket state      │
└─────────────────────────────────────────────────────────┘
```

### Layer Rules & Boundaries

#### A. Presentational Components & Pages (`frontend/src/Pages/`, `frontend/src/components/`)
- **Role**: Render UI markup, manage layout, apply Tailwind CSS styles, and trigger handler callbacks.
- **Rule**: NO `.jsx` file may contain inline `axios`, `fetch()`, or `useEffect` API request handlers. All data fetching and business logic MUST be delegated to custom hooks in `frontend/src/hooks/`.

#### B. Custom Hooks (`frontend/src/hooks/`)
- **Role**: Single source of truth for component logic. Handles data fetching via the shared Axios instance (`frontend/src/lib/api.js`), state management (`useState`), side-effects (`useEffect`), optimistic UI updates, and WebSocket connections.
- **Rule**: Every page or component requiring asynchronous data has a corresponding hook (e.g., `useDMs.js`, `useChat.js`, `useSessions.js`, `useSettings.js`, `useWingman.js`).
- **HTTP Client**: All API calls use the shared **Axios** instance from `frontend/src/lib/api.js`. This instance automatically attaches the `Authorization: Bearer` header from `localStorage` and handles 401 redirects globally.

#### C. Context Providers (`frontend/src/context/`)
- **Role**: Global app state that spans across routes.
- `AuthContext` — user session (JWT token, user object, login/logout).
- `ToastContext` — global toast notifications.

### Directory Structure

```
frontend/src/
├── Pages/
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   ├── OnboardingPage.jsx
│   ├── HomePage.jsx
│   ├── ChatPage.jsx
│   ├── SessionsPage.jsx
│   ├── SettingsPage.jsx
│   └── WingmanPage.jsx
├── components/
│   ├── NavRail.jsx
│   ├── home/
│   │   ├── DMList.jsx
│   │   └── AddDMModal.jsx
│   ├── chat/
│   │   ├── MessageBubble.jsx
│   │   └── WingmanBar.jsx
│   ├── sessions/
│   │   └── SessionCard.jsx
│   └── skeletons/
│       └── Skeletons.jsx
├── hooks/
│   ├── useAuthForms.js
│   ├── useDMs.js
│   ├── useChat.js
│   ├── useSessions.js
│   ├── useSettings.js
│   ├── useOnboarding.js
│   └── useWingman.js
├── context/
│   ├── AuthContext.jsx
│   └── ToastContext.jsx
├── lib/
│   └── api.js          ← Axios instance, Bearer interceptor, 401 handler
├── App.jsx             ← Routes + Protected route guard
├── main.jsx            ← Entry point, providers
└── index.css           ← Tailwind v4 @theme + custom utilities
```

---

## 4. API Key Security (BYOK — Bring Your Own Key)

### Storage Rule (MUST be followed)
- Zernio API keys are **NEVER** stored in plaintext in the database.
- On ingestion: the raw key is encrypted with `cryptography.fernet.Fernet` using `APP_MASTER_KEY` from env.
- The resulting cipher string is stored in `connected_ig_accounts.zernio_api_key_enc`.

### Usage Rule (MUST be followed)
- When the backend needs to call Zernio: fetch the cipher from DB, decrypt it in-memory, inject directly into the `Authorization: Bearer` header, then discard.
- The raw key is **never** returned to the frontend.
- Settings endpoint returns only a masked version: `sk_****...{last4}`.

### Environment Variables Required
```
APP_MASTER_KEY=   # 32-byte Fernet key
JWT_SECRET=       # 64 hex chars
WINGMAN_SECRET=   # 64 hex chars
DATABASE_URL=     # PostgreSQL connection string
FRONTEND_URL=     # e.g. https://your-frontend.vercel.app
```

---

## 5. Key Architectural Decisions & Design Patterns

### 1. JWT Bearer Auth (Stateless)
- No cookies, no server-side sessions.
- The React frontend stores the JWT in `localStorage` and attaches it via the Axios interceptor in `lib/api.js`.
- The backend validates the Bearer token on every protected request via `dependencies.py` (`HTTPBearer`).

### 2. Axios as the Single HTTP Client
- All API calls go through the shared instance in `frontend/src/lib/api.js`.
- The instance is pre-configured with `baseURL`, the Bearer interceptor, and a global 401 handler that clears the token and redirects to `/login`.
- **Never** use raw `fetch()` in any `.jsx` file.

### 3. Optimistic UI in useChat
- When a message is sent, it is immediately added to the local state with a temporary `opt_` ID.
- If the API call fails, the optimistic message is removed and the input is restored.

### 4. WebSocket Real-Time Updates
- Admin chat (`/ws/{ig_username}`) and wingman view (`/ws/view/{token}`) use WebSockets for real-time message delivery.
- WebSocket connection logic lives entirely inside `useChat.js` and `useWingman.js` — never in JSX files.
- Auto-reconnect with 4-second backoff on disconnect.

### 5. Skeleton UI Loaders (Mandatory — No Generic Spinners)
- Every page has a dedicated skeleton component in `frontend/src/components/skeletons/Skeletons.jsx`.
- Generic loading spinners (`animate-spin`) are prohibited for full-page or section loading.
- Skeletons must match the layout of the real content to prevent CLS.

### 6. Compact UI Spacing
- Avoid excessive whitespace, oversized gaps, and unnecessary vertical padding.
- Keep margins, gaps, and paddings compact (`p-4` to `p-5`, `space-y-3` to `space-y-4`, `gap-4`).

### 7. Component Abstraction for Complex Pages
- Pages MUST NOT contain long inline JSX blocks for sub-views or tabs.
- Extract sub-sections into dedicated components under `frontend/src/components/<feature>/`.

---

## 6. Guidelines for Future LLMs & Developers

1. **No API Calls in JSX Files**: NEVER use `axios`, `fetch()`, or `useEffect` API calls directly inside any `.jsx` file. ALWAYS create or consume a dedicated custom hook in `frontend/src/hooks/`.
2. **Always Use the Shared Axios Instance**: Import `api` from `frontend/src/lib/api.js`. Never create a new `axios.create()` in a hook or component (exception: `useWingman.js` uses a separate public instance with no auth header).
3. **Maintain Backend Layering**: Never query database models directly inside router files. Router → Service → Repository.
4. **Routers Return JSON Only**: Never return HTML, templates, or non-OAuth redirects from any router.
5. **No Blocking Operations**: All database and socket handling on the backend remains async/non-blocking.
6. **Mandatory Skeleton UI**: Every new page MUST have a corresponding skeleton in `Skeletons.jsx` displayed during data fetching.
7. **Preserve Auth Contract**: The JWT payload contains `sub` (user_id) and `email`. Do not change this without updating `dependencies.py` and `AuthContext.jsx`.
8. **Abstract Complex Views**: Avoid writing long inline code in page files. Extract tabs, forms, headers, and list views into dedicated components in `frontend/src/components/<feature>/`.
