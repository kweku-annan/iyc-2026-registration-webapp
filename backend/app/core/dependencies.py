"""FastAPI dependencies for authentication and authorization."""

from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import Cookie, Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import AppError
from app.core.security import verify_signed_session_token
from app.models.user import User


def get_current_user(
    session_token: Annotated[str | None, Cookie()] = None,
    db: Session = Depends(get_db)  # noqa: B008
) -> User:
    """Retrieve the current user from the session cookie."""
    if not session_token:
        raise AppError("Not authenticated", code="unauthenticated", status_code=401)

    payload = verify_signed_session_token(session_token)
    user_id = payload.get("sub")

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise AppError("User not found or inactive", code="unauthenticated", status_code=401)

    # Attach payload to user object temporarily so downstream deps can access CSRF token
    user._csrf_token = payload.get("csrf")
    return user


def require_organizer(current_user: User = Depends(get_current_user)) -> User:  # noqa: B008
    """Dependency that requires the 'organizer' role."""
    if current_user.role != "organizer":
        raise AppError("Forbidden", code="forbidden", status_code=403)
    return current_user


def require_volunteer(current_user: User = Depends(get_current_user)) -> User:  # noqa: B008
    """Dependency that requires 'volunteer' or 'organizer' role."""
    if current_user.role not in {"volunteer", "organizer"}:
        raise AppError("Forbidden", code="forbidden", status_code=403)
    return current_user


def verify_csrf(
    request: Request,
    x_csrf_token: Annotated[str | None, Header()] = None,
    current_user: User = Depends(get_current_user)  # noqa: B008
) -> None:
    """Dependency to verify CSRF token on state-changing requests."""
    # Only state changing requests need CSRF verification
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return

    if not x_csrf_token or not current_user._csrf_token:
        raise AppError("Missing CSRF token", code="csrf_missing", status_code=403)

    if not secrets.compare_digest(x_csrf_token, current_user._csrf_token):
        raise AppError("Invalid CSRF token", code="csrf_invalid", status_code=403)
