"""
api/errors.py
=============
LAYER: Infrastructure - Centralized error management & standard exception handlers.

Provides structured JSON error responses across all backend API endpoints.
All API errors return a consistent payload:
{
    "success": false,
    "message": "User-safe error message",
    "detail": "User-safe error message (backward compatibility)",
    "code": "ERROR_CODE_SNAKE_CASE"
}
"""
import logging
import traceback
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

import config
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from starlette.exceptions import HTTPException as StarletteHTTPException

INSTAGRAM_24H_WINDOW_ERROR_MESSAGE = (
    "This message couldn't be sent. Instagram only allows messages within 24 hours of "
    "the person's last interaction with you, and that window has closed for now. "
    "It'll reopen as soon as they message, comment, or reply to your story."
)


def is_24h_window_error(err_msg: str) -> bool:
    """Check if an error string from Zernio/Meta represents Instagram's 24-hour messaging window expiration."""
    if not err_msg:
        return False
    msg_lower = str(err_msg).lower()
    keywords = [
        "outside of allowed window",
        "outside allowed window",
        "allowed window",
        "messaging window",
        "24 hour",
        "24-hour",
        "24h",
        "window has closed",
        "window expired",
        "2534022",
        "recipient must send",
    ]
    return any(k in msg_lower for k in keywords)


# ── Custom Application Base Exception ─────────────────────────────────────────

class AppException(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = 400,
        code: str = "BAD_REQUEST",
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


# ── Domain-Specific Exceptions ────────────────────────────────────────────────

class BadRequestError(AppException):
    def __init__(self, message: str = "Bad request", code: str = "BAD_REQUEST"):
        super().__init__(message=message, status_code=400, code=code)


class NotFoundError(AppException):
    def __init__(self, message: str = "Resource not found", code: str = "NOT_FOUND"):
        super().__init__(message=message, status_code=404, code=code)


class ValidationError(AppException):
    def __init__(self, message: str = "Validation failed", code: str = "VALIDATION_ERROR"):
        super().__init__(message=message, status_code=422, code=code)


class AuthenticationError(AppException):
    def __init__(self, message: str = "Authentication required", code: str = "UNAUTHORIZED"):
        super().__init__(message=message, status_code=401, code=code)


class ForbiddenError(AppException):
    def __init__(self, message: str = "Permission denied", code: str = "FORBIDDEN"):
        super().__init__(message=message, status_code=403, code=code)


class ConflictError(AppException):
    def __init__(self, message: str = "Resource conflict", code: str = "CONFLICT"):
        super().__init__(message=message, status_code=409, code=code)


class ZernioAPIError(AppException):
    def __init__(self, message: str = "Zernio API error", status_code: int = 502, code: str = "ZERNIO_API_ERROR"):
        super().__init__(message=message, status_code=status_code, code=code)


# ── Helper for CORS Headers on Error Responses ────────────────────────────────

def _cors_headers(request: Request) -> Dict[str, str]:
    origin = request.headers.get("origin") or "*"
    return {
        "Access-Control-Allow-Origin": origin if origin != "*" else "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Origin, X-Requested-With, X-Hoop-Instagram-Account, x-hoop-instagram-account",
    }


def _error_response(
    request: Request,
    status_code: int,
    message: str,
    code: str,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "detail": message,  # Backward compatibility for frontend toasts
            "code": code,
        },
        headers=_cors_headers(request),
    )


# ── Sentry Filtering & Initialization ─────────────────────────────────────────

def sentry_before_send(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Ensure ONLY genuine 5xx server errors and unhandled exceptions are reported to Sentry.
    All 4xx client errors (validation, auth, not found, bad request) are ignored.
    """
    if "exc_info" in hint:
        _, exc_value, _ = hint["exc_info"]
        if isinstance(exc_value, (HTTPException, StarletteHTTPException)):
            if exc_value.status_code < 500:
                return None
        if isinstance(exc_value, RequestValidationError):
            return None
        if isinstance(exc_value, AppException) and exc_value.status_code < 500:
            return None
    return event


def init_sentry() -> None:
    """Initialize Sentry SDK if SENTRY_DSN is configured in environment."""
    if not config.SENTRY_DSN:
        logging.info("[Sentry] SENTRY_DSN not configured. Sentry error monitoring is inactive.")
        return

    sentry_sdk.init(
        dsn=config.SENTRY_DSN,
        send_default_pii=True,
        enable_logs=True,
        traces_sample_rate=1.0,
        profile_session_sample_rate=1.0,
        profile_lifecycle="trace",
        before_send=sentry_before_send,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            StarletteIntegration(transaction_style="endpoint"),
        ],
    )
    logging.info("[Sentry] Sentry SDK initialized for production error monitoring.")


# ── Exception Registration ───────────────────────────────────────────────────

def register_exception_handlers(app: FastAPI) -> None:
    """Attach global exception handlers to the FastAPI app."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        if exc.status_code < 500:
            logging.warning(
                f"[AppException] {request.method} {request.url.path} -> {exc.status_code} [{exc.code}]: {exc.message}"
            )
        else:
            logging.error(
                f"[AppException] {request.method} {request.url.path} -> {exc.status_code} [{exc.code}]: {exc.message}"
            )
            if config.SENTRY_DSN:
                sentry_sdk.capture_exception(exc)
        return _error_response(request, exc.status_code, exc.message, exc.code)

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        detail = str(exc.detail) if exc.detail else "An error occurred"
        status_to_code = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            409: "CONFLICT",
            422: "VALIDATION_ERROR",
            429: "TOO_MANY_REQUESTS",
        }
        code = status_to_code.get(
            exc.status_code,
            "HTTP_CLIENT_ERROR" if exc.status_code < 500 else "INTERNAL_SERVER_ERROR"
        )

        if exc.status_code < 500:
            logging.warning(
                f"[HTTPException] {request.method} {request.url.path} -> {exc.status_code} [{code}]: {detail}"
            )
            return _error_response(request, exc.status_code, detail, code)

        logging.error(
            f"[HTTPException] {request.method} {request.url.path} -> {exc.status_code} [{code}]: {detail}"
        )
        if config.SENTRY_DSN:
            sentry_sdk.capture_exception(exc)
        return _error_response(
            request,
            exc.status_code,
            "An unexpected server error occurred. Please try again in a moment.",
            "INTERNAL_SERVER_ERROR",
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = exc.errors()
        messages = []
        for err in errors:
            loc = " -> ".join(str(l) for l in err.get("loc", []) if l != "body")
            msg = err.get("msg", "Invalid value")
            messages.append(f"{loc}: {msg}" if loc else msg)
        formatted_message = "; ".join(messages) if messages else "Invalid request body or parameters"

        logging.warning(
            f"[RequestValidationError] {request.method} {request.url.path} -> 422 [VALIDATION_ERROR]: {formatted_message}"
        )
        return _error_response(request, 422, formatted_message, "VALIDATION_ERROR")

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logging.error(
            f"[UnhandledException] {request.method} {request.url.path} -> 500:\n{traceback.format_exc()}"
        )
        if config.SENTRY_DSN:
            sentry_sdk.capture_exception(exc)
        return _error_response(
            request,
            500,
            "An unexpected server error occurred. Please try again in a moment.",
            "INTERNAL_SERVER_ERROR",
        )
