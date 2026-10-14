# Error Handling & Sentry Monitoring

This document details Hooop's production error handling architecture, the separation between client and server errors, and how Sentry is configured for real-time alerting.

---

## 1. Core Architecture & Philosophy

Hooop enforces a strict separation between client-side user errors (`4xx`) and server-side code crashes (`5xx`):

- **4xx User Errors**: Handled gracefully and locally. These return consistent, structured JSON responses to the frontend and are filtered out from Sentry to prevent alert spam.
- **5xx Server Errors**: Captured automatically by Sentry with full stack traces, request context, and performance spans, routing instant alerts to `errorlogs@hooop.tech`.

```mermaid
graph TD
    Request["Incoming HTTP Request"] --> Router["FastAPI Router"]
    Router --> Service["Service Layer"]
    Service --> Repo["Repository Layer"]
    
    Router -.->|Client Error (4xx)| ClientHandler["4xx Exception Handlers"]
    ClientHandler -->|Filtered Out| SentryBeforeSend["before_send Filter"]
    SentryBeforeSend -->|Dropped (No Alert)| Drop["No Sentry Event"]
    ClientHandler -->|JSON Response| Client["User Interface"]
    
    Service -.->|Unhandled Crash (5xx)| CatchAll["Global 500 Handler"]
    CatchAll -->|Captured| SentrySDK["sentry_sdk.capture_exception()"]
    SentrySDK -->|Alerts| SentryDashboard["Sentry / errorlogs@hooop.tech"]
    CatchAll -->|Safe JSON 500| Client
```

---

## 2. Client-Side Errors (4xx) - Handled Cleanly

Client errors represent expected validation failures, bad user input, or unauthorized requests.

### Supported Types & Status Codes
- **400 Bad Request**: Handled via `BadRequestError` or `HTTPException(status_code=400)`.
- **401 Unauthorized**: Handled via `AuthenticationError` or `HTTPException(status_code=401)`.
- **403 Forbidden**: Handled via `ForbiddenError` or `HTTPException(status_code=403)`.
- **404 Not Found**: Handled via `NotFoundError` or `HTTPException(status_code=404)`.
- **409 Conflict**: Handled via `ConflictError` or `HTTPException(status_code=409)`.
- **422 Validation Error**: Pydantic validation failures caught by `RequestValidationError`.

### Standardized Response Format
Every 4xx error returns a predictable JSON structure consumed by custom frontend hooks:
```json
{
  "success": false,
  "message": "User-safe error explanation",
  "detail": "User-safe error explanation",
  "code": "ERROR_CODE"
}
```

### Sentry Alert Suppression
To keep monitoring clean and actionable, `backend/api/errors.py` implements a `sentry_before_send` hook:
```python
def sentry_before_send(event, hint):
    if "exc_info" in hint:
        _, exc_value, _ = hint["exc_info"]
        if isinstance(exc_value, (HTTPException, StarletteHTTPException)) and exc_value.status_code < 500:
            return None
        if isinstance(exc_value, RequestValidationError):
            return None
        if isinstance(exc_value, AppException) and exc_value.status_code < 500:
            return None
    return event
```
Any 4xx exception returns `None` and is discarded by Sentry.

---

## 3. Server-Side Crashes (5xx) - Sentry Alerting

Unhandled code crashes and database connectivity drops are caught by the global catch-all exception handler in `backend/api/errors.py`.

### Escalation Flow
1. The global `@app.exception_handler(Exception)` intercepts the unhandled error.
2. The exception and full traceback are logged at `ERROR` level to stdout.
3. The exception is captured and transmitted to Sentry via `sentry_sdk.capture_exception(exc)`.
4. Sentry routes real-time error notifications directly to `errorlogs@hooop.tech`.
5. The client receives a safe, generic 500 JSON response without leaking sensitive code, file paths, or database traces:
   ```json
   {
     "success": false,
     "message": "An unexpected server error occurred. Please try again in a moment.",
     "detail": "An unexpected server error occurred. Please try again in a moment.",
     "code": "INTERNAL_SERVER_ERROR"
   }
   ```

---

## 4. Verifying Sentry Integration

You can confirm that Sentry captures production errors end to end:
1. Start the backend server (`uv run uvicorn main:app`).
2. Make a GET request to:
   ```bash
   curl http://localhost:8000/api/sentry-debug
   ```
3. An unhandled `ZeroDivisionError` is simulated, captured by Sentry, and reported to your Sentry dashboard under the `hoop-backend` project.

---

## 5. Configuration & Environment Variables

| Variable | Required | Description | Example |
|:---|:---|:---|:---|
| `SENTRY_DSN` | Production | Sentry Project DSN for capturing 5xx errors | `https://...@ingest.de.sentry.io/...` |
| `FRONTEND_URL` | Production | Allowed frontend origin for CORS | `https://hooop.tech` |
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection URI with SSL | `postgresql://...@db....supabase.co:5432/...` |
| `APP_MASTER_KEY` | Yes | Fernet 32-byte key for encrypting user API keys | `Base64 Fernet key` |
| `JWT_SECRET` | Yes | 64-character hex secret for auth JWT tokens | `Hex string` |
| `WINGMAN_SECRET` | Yes | 64-character hex secret for wingman tokens | `Hex string` |
