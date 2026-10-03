"""Domain exceptions for the IYC-2026 backend.

These are raised by service-layer functions and caught by FastAPI exception
handlers (registered in app/main.py) to produce consistent JSON error responses.
"""

from __future__ import annotations


class AppError(Exception):
    """Base for all application-level errors."""

    def __init__(self, detail: str, code: str, status_code: int = 400) -> None:
        super().__init__(detail)
        self.detail = detail
        self.code = code
        self.status_code = status_code


class PhoneValidationError(AppError):
    """Raised when a phone number cannot be parsed or is invalid."""

    def __init__(self, detail: str = "Invalid phone number.") -> None:
        super().__init__(detail=detail, code="invalid_phone", status_code=422)


class TicketValidationError(AppError):
    """Raised when a ticket code is malformed or contains invalid characters."""

    def __init__(self, detail: str = "Invalid ticket code.") -> None:
        super().__init__(detail=detail, code="invalid_ticket_code", status_code=422)


class RateLimitError(AppError):
    """Raised when a user or IP hits a rate limit."""

    def __init__(self, detail: str = "Too many requests.") -> None:
        super().__init__(detail=detail, code="rate_limited", status_code=429)
