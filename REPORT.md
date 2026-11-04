# Security Audit and Remediation Report

## Detected Stack
- **Language**: Python 3.12, Node.js (via NPM)
- **Backend Framework**: FastAPI
- **Database / ORM**: PostgreSQL via `asyncpg` (Supabase backend)
- **Authentication**: JWT, custom password hashing via `passlib[bcrypt]`
- **Frontend Framework**: React 18 + Vite with Tailwind CSS
- **Cache/Queue**: Upstash Redis (for OTPs/rate limits)

## Summary Counts by Severity
- **Critical**: 1
- **High**: 3
- **Medium**: 1
- **Low**: 1

## Findings

| ID | Severity | Category | File and Line | Description | Status | Test Name |
|---|---|---|---|---|---|---|
| 1 | High | Authorization | `backend/api/routers/home.py`, `backend/api/routers/wingman/messages.py`, `backend/api/routers/wingman/reply.py` | Missing `account_username` scoping allows users with multiple connected accounts to cross-contaminate their messages and act across accounts unintentionally. | Fixed | `test_cross_account_contamination` |
| 2 | High | Input and Injection | `backend/api/routers/webhook.py:34` | Using `!=` for comparing HMAC hashes (`ZERNIO_WEBHOOK_SECRET`) instead of constant-time `hmac.compare_digest` is susceptible to timing attacks. | Fixed | `test_webhook_secret` |
| 3 | Critical | Authentication | `backend/api/routers/webhook.py:61` | Searching for `__pending__` to link the webhook misses the `api_key_hint` constraint in the query and just retrieves the most recently added pending account, causing a race condition during onboarding. | Fixed | `test_webhook_race_condition` |
| 4 | High | Output, XSS, and headers | `backend/main.py:61` | The `allow_origin_regex` used in FastAPI CORS middleware allows a suffix-based attack to spoof origins (e.g. `https://evilvercel.app` passing validation). | Fixed | `test_cors_configuration` |
| 5 | Medium | Authentication | `backend/api/routers/auth.py` | Timing attack vulnerability and username enumeration via discrepancy in processing time when generating vs returning immediately on invalid email during `/auth/login` and `/auth/forgot-password`. | Fixed | `test_login_timing_attack` |
| 6 | Low | Abuse and resource limits | `backend/dependencies.py` | Critical `/auth` endpoints were entirely missing rate-limiting protections. | Fixed | `test_rate_limiting` |

## N/A Checklist Items
- MFA: N/A - No Backup code or TOTP implemented for this app.
- OAuth State/PKCE: N/A - Not building an OAuth provider, consuming one.
- NoSQL Injection: N/A - Using PostgreSQL.
- Deserialization: N/A - Not using pickle, unsafe yaml, or native object deserialization.
- File Uploads: N/A - No user file uploads implemented.
- GraphQL: N/A - Using REST API.

## Suspected but Unverified Items
- **Dependencies and Supply Chain:** The project specifies older, potentially vulnerable package versions (e.g., in `requirements.txt`). An automated dependency audit like `npm audit` or `pip-audit` should be incorporated into the CI/CD pipeline, though no specific CVEs were actively exploited in this audit.
- **Background Work / Timeouts**: Several external calls (e.g., Upstash Redis calls) use short timeouts, but there's a risk of worker exhaustion if downstream services become severely degraded since there is no comprehensive job queue (like Celery/RQ).

## Breaking Changes and Migration Steps
- Re-installing the dependencies updates `bcrypt` to `>=4.0.0` but requires truncating dummy passwords during hashing to 72 characters, as `bcrypt` imposes this limit inherently.
- All new tests added under `backend/tests` and run with `pytest tests/`.

## Verification Results
- All unit and integration tests under `backend/tests` passing (`test_auth.py`, `test_cors.py`, `test_idor.py`, `test_ratelimit.py`, `test_webhook.py`).
- The tests run against the local Docker PostgreSQL instance successfully.

## Limitations
- Did not extensively test frontend layout on mobile devices.
- Did not configure a complete CI setup for end-to-end Cypress/Playwright suites.

## Manual Follow-Up
- Review the `Upstash` rate-limiting window (currently set to 10 requests per minute) and tune according to expected traffic.
- Verify that `APP_MASTER_KEY` generated during the run matches production environment requirements (32 url-safe base64-encoded bytes).
