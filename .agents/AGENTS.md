# Hooop Workspace Guidelines & AI Agent Rules

This document outlines the core architectural and coding standards for developers and AI agents working on **Hooop**.

---

## 🎨 Architectural Principles

1. **Independent Component Rendering & Isolated Skeletons**:
   - Each component on a page that is not interdependent on another component MUST render on its own immediately.
   - Do not block the entire page or layout behind a global loading spinner.
   - Components that require asynchronous data fetching must render their own localized skeleton loader (`DMListSkeleton`, `MessageSkeleton`) while fetching.
   - Separate data-fetching logic so components fetch independently rather than waiting on each other.

2. **Hook-Driven Frontend Architecture**:
   - All network calls (`axios`, `fetch`) and state management MUST be encapsulated inside custom hooks (`src/hooks/`).
   - Presentation components (`src/components/`, `src/Pages/`) must receive ready-to-use state and callback functions as props or from hooks. Zero inline `axios` calls in JSX.

3. **Strict 4-Layer Backend Architecture**:
   - **Router Layer** (`api/routers/*`): HTTP handling, schema validation, auth verification. Zero SQL.
   - **Service Layer** (`services/*`): External API wrappers (Zernio API client), business workflows. Zero direct DB calls.
   - **Repository Layer** (`repositories/*`): Database interaction via `asyncpg`. Pure SQL.
   - **Database Layer** (`db.py`): PostgreSQL connection pool lifecycle.

4. **Bring Your Own Key (BYOK) Security**:
   - User API keys are encrypted at rest using Fernet AES-128-CBC (`cryptography.fernet`) with `APP_MASTER_KEY`.
   - Never log or return unencrypted API keys to the frontend.

5. **Scroll-Up Pagination & Deduplication**:
   - Use Zernio pagination cursors for fetching older messages.
   - Prepend new batches into chat state (`setMessages(prev => [...newBatch, ...prev])`) while preserving scroll anchor position using `scrollHeight` offsets.
