# Hooop Developer Documentation - v1.0.0 (First Version)

Hooop is a platform that lets your hb/hg help you out when you are out of words. It brings all your social conversations into one screen and lets your trusted wingmen step in to help you reply when you need a hand.

> [!NOTE]
> **Release Version**: `v1.0.0` (First Version). This repository contains the complete full-stack implementation: the **FastAPI backend** (in `backend/`) and the **React Vite frontend** (in `frontend/`).

---

## Tech Stack

| Component Layer | Technology | Primary Package / Version | Source File Reference |
|:---|:---|:---|:---|
| **Frontend Framework** | React 18 + Vite | `react` `^18.3.1`, `vite` `^5.4.1` | `frontend/package.json` |
| **Frontend Styling** | Vanilla CSS + Tailwind CSS v4 | `@tailwindcss/vite` `^4.0.0` | `frontend/package.json` |
| **Realtime Engine** | Supabase Realtime (WebSockets) | `@supabase/supabase-js` `^2.45.0` | `frontend/src/lib/supabase.js` |
| **Backend Framework** | FastAPI | `fastapi` `>=0.100.0`, `uvicorn` `>=0.20.0` | `backend/requirements.txt` |
| **Python Environment** | Python 3.10+ | `requires-python = ">=3.10"` | `backend/main.py` |
| **Database & Connection Pool** | PostgreSQL + asyncpg | `asyncpg` `>=0.28.0` | `backend/db.py` |
| **Instagram Proxy API** | Zernio API Client | `httpx` `>=0.24.0` | `backend/services/zernio/client.py` |
| **Credential Encryption** | Fernet AES-128-CBC | `cryptography` `>=41.0.0` | `backend/crypto.py` |
| **Authentication** | JWT (JSON Web Tokens) | `pyjwt` `>=2.8.0`, `passlib` (bcrypt) | `backend/dependencies.py` |

---

## Suggested Reading Order for New Developers

1. [**Getting Started**](getting-started.md) - Local prerequisites, environment variables configuration, running backend/frontend dev servers.
2. [**Architecture & Design Patterns**](architecture.md) - High-level system architecture diagram, 4-layer backend architecture, hook-driven frontend architecture, and key design decisions.
3. [**Data & Message Flows**](data-flows.md) - Sequence diagrams for initial message load, scroll-up pagination, realtime updates, message sending, and wingman sessions.
4. [**Security Architecture**](security.md) - Bring Your Own Key (BYOK) model, Fernet AES-128 encryption pipeline, and JWT authentication lifecycle.
5. [**Frontend Guidelines**](frontend-guide.md) - Custom hook abstraction pattern, independent component rendering, isolated skeleton loaders, scroll restoration, and responsive UI rules.
6. [**API Reference**](api-reference.md) - Complete list of REST API endpoints, request/response formats, and authentication rules.
7. [**Developer & AI Agent Onboarding**](contributing.md) - Codebase directory tree, step-by-step feature additions, AI agent rules, and verification checklist.
