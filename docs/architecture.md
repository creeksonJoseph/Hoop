# System Architecture

This document details the software architecture, design patterns, layered backend structure, and key architectural decisions behind **Hooop**.

---

## High-Level System Architecture

Hooop is built as a decoupled web application with a Python FastAPI backend and a React/Vite single-page application (SPA). It integrates with Supabase PostgreSQL for persistence and realtime event streaming, and uses Zernio API as a secure proxy to Instagram Direct Messages.

```mermaid
graph TD
    Client["React Frontend (SPA)"]
    FastAPI["FastAPI Backend"]
    SupabaseDB[(Supabase PostgreSQL)]
    SupabaseRT["Supabase Realtime (WebSockets)"]
    Zernio["Zernio API (Instagram Proxy)"]
    Instagram["Instagram Direct Messages"]

    Client -->|REST API Requests (JWT Auth)| FastAPI
    Client -->|Realtime Subscriptions| SupabaseRT
    FastAPI -->|DB Reads / Writes (asyncpg)| SupabaseDB
    FastAPI -->|Encrypted API Key Sync| Zernio
    Zernio <-->|Official Instagram API| Instagram
    SupabaseDB -->|Database Changes| SupabaseRT
```

---

## Layered Backend Architecture

The backend strictly enforces a **4-layer architectural pattern**. Code must never bypass intermediate layers (e.g. a Router calling `asyncpg` directly is prohibited).

```
┌─────────────────────────────────────────────────────────┐
│ 1. ROUTER LAYER (api/routers/*)                         │
│ - Accepts HTTP requests, parses query/body params       │
│ - Validates JWT auth headers via dependencies           │
│ - Delegates logic to Services or Repositories           │
│ - Returns JSON responses (Pydantic / Dicts)             │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ 2. SERVICE LAYER (services/*)                           │
│ - Encapsulates external APIs (Zernio HTTP Client)        │
│ - Handles business workflows, pagination cursors,       │
│   and encrypted token operations                        │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ 3. REPOSITORY LAYER (repositories/*)                   │
│ - Pure database access layer                            │
│ - Executes raw SQL queries using asyncpg pool           │
│ - Returns clean dicts / domain objects                  │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ 4. DATABASE LAYER (db.py)                               │
│ - Manages global PostgreSQL connection pool             │
│ - Handles connection lifecycle (init/close)             │
└─────────────────────────────────────────────────────────┘
```

### Key Rules for Backend Layers:
1. **Routers**: Must contain **zero SQL queries** and **zero raw HTTP calls** to third-party services.
2. **Services**: Must contain **zero database connections** (`db.py` calls). Service functions accept parameters and call Repositories for data operations.
3. **Repositories**: Must contain **pure SQL execution** via `db.get_pool()`. They do not handle HTTP responses or format output for APIs.
4. **Shared Utilities**: Crypto (`crypto.py`), Config (`config.py`), and Auth Dependencies (`dependencies.py`) sit alongside layers as stateless modules.

---

## Hook-Driven Frontend Architecture

The frontend follows a **Hook-Driven Architecture**, completely separating visual rendering from state management and network calls.

```
┌─────────────────────────────────────────────────────────┐
│ 1. PAGES (Pages/*.jsx)                                  │
│ - Define high-level page layouts and routing shells    │
│ - Combine visual components                            │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ 2. COMPONENTS (components/*.jsx)                       │
│ - Pure visual components (ChatView, DMList, NavRail)   │
│ - Must NOT contain raw axios/fetch calls                │
│ - Receive handlers and state directly from Hooks       │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ 3. CUSTOM HOOKS (hooks/*.jsx, hooks/chat/*)             │
│ - Own all application logic, state, and effects         │
│ - Manage network loading, errors, and pagination       │
│ - Expose ready-to-use data and callback functions       │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ 4. API CLIENT (lib/api.js)                              │
│ - Configured Axios instance with baseURL               │
│ - Automatically injects JWT Bearer token on requests    │
│ - Handles global 401 Unauthorized logouts               │
└─────────────────────────────────────────────────────────┘
```

---

## Key Architectural Decisions & Rationale

### 1. BYOK (Bring Your Own Key) Security
- **Decision**: Users provide their own Zernio API keys for social network access.
- **Implementation**: Keys are encrypted at rest using **Fernet AES-128-CBC** (`cryptography.fernet`) with `APP_MASTER_KEY`. Plaintext keys are never logged or returned to the frontend.
- **Why**: Protects user credentials even if a database snapshot is leaked.

### 2. DB-First Caching & Background Cursor Sync
- **Decision**: When opening a conversation, existing messages are immediately fetched from Supabase DB and rendered in <100ms.
- **Implementation**: The backend returns stored DB messages first, while asynchronously querying Zernio to fetch the real Zernio pagination cursor.
- **Why**: Provides instantaneous UI response while preserving seamless scroll-up pagination for older messages.

### 3. Scroll-Up Pagination with ID Deduplication
- **Decision**: Fetch older messages as the user scrolls to the top of the chat, appending seamlessly without page jumps.
- **Implementation**: Frontend `useMessages` maintains a list of `seenIds`. When the backend returns a new batch from Zernio using the stored cursor, older messages are prepended (`[...newBatch, ...existingMsgs]`) and scroll position is adjusted using `scrollHeight` offsets.
- **Why**: Matches native messaging app expectations (WhatsApp, Instagram).

### 4. Supabase Realtime for Instant Delivery
- **Decision**: Use Supabase Realtime channel subscriptions over WebSockets for instant message delivery instead of polling.
- **Implementation**: When Zernio receives a message webhook or when a message is saved to Supabase PostgreSQL, Supabase streams the `INSERT` event directly to connected clients.
- **Why**: Low overhead, instantaneous delivery, and built-in automatic reconnect capabilities.

### 5. Independent Component Rendering & Isolated Skeletons
- **Decision**: Each independent UI section on a page renders its static structure immediately and displays its own localized skeleton loader while fetching data.
- **Implementation**: Sidebar navigation, empty state canvases, and headers render without waiting for message threads. Thread lists render skeleton cards locally.
- **Why**: Maximizes perceived application speed and eliminates full-page loading screens.

---

## Database Schema Overview

```mermaid
erdiagram
    USERS {
        uuid id PK
        string email
        string password_hash
        timestamp created_at
    }

    CONNECTED_ACCOUNTS {
        uuid id PK
        uuid user_id FK
        string platform
        string account_name
        text encrypted_api_key
        timestamp created_at
    }

    MESSAGES {
        uuid id PK
        uuid account_id FK
        string zernio_msg_id
        string sender_id
        string recipient_id
        text text_content
        jsonb raw_payload
        timestamp created_at
    }

    WINGMAN_SESSIONS {
        uuid id PK
        uuid user_id FK
        string session_token
        string guest_name
        timestamp expires_at
    }

    USERS ||--o{ CONNECTED_ACCOUNTS : "owns"
    CONNECTED_ACCOUNTS ||--o{ MESSAGES : "receives"
    USERS ||--o{ WINGMAN_SESSIONS : "creates"
```
