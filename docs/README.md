# Welcome to Hooop 🏀

> **Hooop** is an Instagram DM management platform that brings all your conversations into one fast interface and lets your trusted wingmen step in to help you reply when you're at a loss for words.

---

## 📚 Documentation Navigation

This `docs/` folder contains comprehensive guides detailing every part of the Hooop platform architecture, data flow, security model, and developer standards:

| Document | Description |
|---|---|
| [**Architecture Overview**](file:///home/creeksonjoseph/softwarengineering/personal-projects/Hoop/docs/architecture.md) | System overview, layered backend structure, hook-driven frontend, and key design decisions. |
| [**Data & Message Flows**](file:///home/creeksonjoseph/softwarengineering/personal-projects/Hoop/docs/data-flows.md) | Sequence diagrams for message fetching, scroll-up pagination, realtime updates, and sending messages. |
| [**Security & BYOK**](file:///home/creeksonjoseph/softwarengineering/personal-projects/Hoop/docs/security.md) | How API keys are encrypted at rest (Bring Your Own Key) and JWT authentication contract. |
| [**Frontend Guidelines**](file:///home/creeksonjoseph/softwarengineering/personal-projects/Hoop/docs/frontend-guide.md) | Custom hook patterns, independent component rendering, skeleton loaders, and responsive UI principles. |
| [**API Reference**](file:///home/creeksonjoseph/softwarengineering/personal-projects/Hoop/docs/api-reference.md) | Complete list of REST API endpoints, request/response formats, and authentication rules. |
| [**Developer Onboarding**](file:///home/creeksonjoseph/softwarengineering/personal-projects/Hoop/docs/contributing.md) | Step-by-step setup guide, how to add new features, AI agent rules, and verification checklist. |

---

## 🛠️ Technology Stack

### Backend
- **Framework**: Python 3.10+ with [FastAPI](https://fastapi.tiangolo.com/)
- **Database**: PostgreSQL hosted on [Supabase](https://supabase.com/) via `asyncpg` connection pooling
- **Instagram Proxy**: [Zernio API](https://zernio.com/) for managing Instagram DMs and social connections
- **Encryption**: AES-128-CBC via Python `cryptography.fernet` for API key protection
- **Authentication**: JWT (JSON Web Tokens) with standard Bearer authentication

### Frontend
- **Framework**: React 18 powered by [Vite](https://vitejs.dev/)
- **Styling**: Vanilla CSS + [Tailwind CSS v4 `@theme`](https://tailwindcss.com/)
- **Realtime Updates**: Supabase JS WebSockets (`@supabase/supabase-js`)
- **Icons**: Lucide React icons
- **HTTP Client**: Axios with request/response interceptors

---

## ⚡ Quick Start Guide

### Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: v18 or higher
- **PostgreSQL Database** (e.g. Supabase instance)
- **Zernio API Credentials**

---

### 1. Backend Setup

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment template and fill in your keys:
   ```bash
   cp .env.example .env
   ```
5. Start the backend server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

---

### 2. Frontend Setup

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   Open your browser to `http://localhost:5173`.

---

## 🔑 Environment Variables Reference

### Backend `.env`
| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Supabase anon or service role API key |
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`) |
| `ZERNIO_API_KEY` | Primary API key for communicating with Zernio proxy |
| `APP_MASTER_KEY` | 32-byte base64 key used for Fernet encryption of stored user keys |
| `JWT_SECRET` | Secret key used to sign and verify user JWT tokens |
| `JWT_ALGORITHM` | Token signature algorithm (default: `HS256`) |

### Frontend `.env`
| Variable | Description |
|---|---|
| `VITE_API_URL` | URL of the backend API (e.g. `http://localhost:8000/api`) |
| `VITE_SUPABASE_URL` | Public Supabase project URL for Realtime subscriptions |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase anon key for client WebSocket connection |

---

> [!NOTE]
> For questions or contribution guidelines, see [contributing.md](file:///home/creeksonjoseph/softwarengineering/personal-projects/Hoop/docs/contributing.md).
