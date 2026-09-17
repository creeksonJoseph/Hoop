"""
api/errors.py
=============
LAYER: Infrastructure — Centralized error management & standard exception handlers.

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
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
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


# ── Exception Registration ───────────────────────────────────────────────────

def register_exception_handlers(app: FastAPI) -> None:
    """Attach global exception handlers to the FastAPI app."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        logging.warning(
            f"[AppException] {request.method} {request.url.path} -> {exc.status_code} [{exc.code}]: {exc.message}"
        )
        return _error_response(request, exc.status_code, exc.message, exc.code)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        detail = str(exc.detail) if exc.detail else "An error occurred"
        code = "HTTP_ERROR"
        if exc.status_code == 401:
            code = "UNAUTHORIZED"
        elif exc.status_code == 403:
            code = "FORBIDDEN"
        elif exc.status_code == 404:
            code = "NOT_FOUND"
        elif exc.status_code == 409:
            code = "CONFLICT"

        logging.warning(
            f"[HTTPException] {request.method} {request.url.path} -> {exc.status_code} [{code}]: {detail}"
        )
        return _error_response(request, exc.status_code, detail, code)

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
        return _error_response(
            request,
            500,
            "An unexpected error occurred. Please try again in a moment.",
            "INTERNAL_SERVER_ERROR",
        )
