# Developer & AI Agent Onboarding Guide

Welcome! Whether you are a human developer or an autonomous AI agent working on **Hooop**, this guide explains how to navigate the codebase, add new features, maintain structural integrity, and run verification checks.

---

## Codebase Directory Structure

```
/Hoop
├── docs/                           # Developer documentation suite
├── .agents/                        # Workspace rules & agent instructions
│   └── AGENTS.md                   # Core development rules & guidelines
├── backend/                        # FastAPI Backend
│   ├── main.py                     # App entry point, CORS & middleware
│   ├── db.py                       # asyncpg PostgreSQL pool manager
│   ├── config.py                   # Pydantic environment configuration
│   ├── crypto.py                   # Fernet AES key encryption helpers
│   ├── dependencies.py             # FastAPI Auth & dependency injection
│   ├── api/routers/                # HTTP Routers (Layer 1)
│   │   ├── auth.py
│   │   ├── home.py
│   │   ├── chat/                   # Chat & messaging endpoints
│   │   │   ├── messages.py
│   │   │   └── formatters.py
│   │   ├── sessions.py
│   │   ├── settings.py
│   │   ├── onboarding.py
│   │   └── wingman.py
│   ├── services/                   # Business Services & External Clients (Layer 2)
│   │   └── zernio/                 # Zernio API HTTP wrapper & handlers
│   └── repositories/               # Pure Database Repositories (Layer 3)
│       ├── user_repo.py
│       ├── account_repo.py
│       ├── message_repo.py
│       └── session_repo.py
└── frontend/                       # React 18 + Vite Frontend
    └── src/
        ├── Pages/                  # High-level page shells
        ├── components/             # Visual components (chat, home, skeletons)
        ├── hooks/                  # Custom state & network logic hooks
        │   └── chat/               # useMessages, useRealtime, useActions
        ├── context/                # AuthContext, ToastContext
        └── lib/api.js              # Axios instance with Bearer interceptor
```

---

## Step-by-Step: Adding a New Feature

### 1. Adding a Backend Endpoint

Follow the 4-layer rule strictly:

1. **Repository Layer** (`repositories/your_feature_repo.py`):
   Write pure SQL methods using `db.get_pool()`.
   ```python
   async def get_feature_data(user_id: str) -> dict:
       pool = await db.get_pool()
       async with pool.acquire() as conn:
           row = await conn.fetchrow("SELECT * FROM feature_table WHERE user_id = $1", user_id)
           return dict(row) if row else {}
   ```

2. **Service Layer** (`services/your_service.py`):
   Implement business logic or external third-party API calls.

3. **Router Layer** (`api/routers/your_feature.py`):
   Define FastAPI endpoints using Pydantic schemas and dependency injection (`get_current_user`).
   ```python
   @router.get("/feature")
   async def read_feature(current_user: dict = Depends(get_current_user)):
       return await get_feature_data(current_user["id"])
   ```

4. **Register Router in `main.py`**:
   ```python
   app.include_router(your_feature.router, prefix="/api")
   ```

---

### 2. Adding a Frontend Feature

Follow the Hook-Driven pattern strictly:

1. **Create Custom Hook** (`src/hooks/useFeature.js`):
   Perform all `api.get()` / `api.post()` operations inside a custom hook using React state (`useState`, `useEffect`, `useCallback`).
   ```javascript
   export function useFeature() {
     const [data, setData] = useState(null);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
       api.get('/feature').then(res => setData(res.data)).finally(() => setLoading(false));
     }, []);

     return { data, loading };
   }
   ```

2. **Create Presentation Component** (`src/components/FeatureView.jsx`):
   Receive data and loading states as props. Render a localized skeleton loader when `loading` is true.

---

## Core Rules for AI Agents & Developers

The following rules are enforced in `.agents/AGENTS.md` and must be adhered to on every code edit:

1. **Layer Separation**: Routers must never execute raw SQL (`asyncpg`). Repositories must never perform raw HTTP calls.
2. **Hook Isolation**: React components must never contain inline `axios` or `fetch` calls. All logic belongs in `src/hooks/`.
3. **Independent Component Rendering**: UI components that do not depend on each other must render immediately. Components waiting for async data must display their own localized skeleton loader.
4. **Clean Builds**: Always verify syntax and builds before declaring task completion.

---

## Verification Checklist

Before pushing changes or completing a task, run the following verification checks:

### 1. Backend Syntax Check
Run Python compiler check across all backend files:
```bash
python3 -m py_compile backend/main.py backend/config.py backend/api/routers/*.py backend/api/routers/chat/*.py backend/services/zernio/*.py backend/repositories/*.py
```
*Expected result: 0 syntax errors.*

### 2. Frontend Production Build
Run Vite production bundle build:
```bash
cd frontend && npm run build
```
*Expected result: Build succeeds with 0 import errors.*
