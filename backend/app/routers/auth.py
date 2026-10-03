"""Authentication endpoints."""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import AppError, RateLimitError
from app.core.security import create_signed_session_token, generate_csrf_token, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

LOGIN_RATE_LIMIT_MAX = 5
LOGIN_RATE_LIMIT_WINDOW = 300  # 5 minutes

_login_attempts: dict[str, list[float]] = defaultdict(list)


def _check_login_rate_limit(ip_address: str) -> None:
    now = time.time()
    _login_attempts[ip_address] = [
        t for t in _login_attempts[ip_address]
        if now - t < LOGIN_RATE_LIMIT_WINDOW
    ]
    if len(_login_attempts[ip_address]) >= LOGIN_RATE_LIMIT_MAX:
        raise RateLimitError("Too many login attempts. Please try again later.")
    _login_attempts[ip_address].append(now)


@router.post("/login", response_model=UserResponse)
def login(
    request: Request,
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)  # noqa: B008
) -> UserResponse:
    """Log in a user and set a session cookie."""
    ip_address = request.client.host if request.client else "unknown"
    _check_login_rate_limit(ip_address)

    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.is_active:
        raise AppError("Invalid email or password", code="invalid_credentials", status_code=401)

    if not verify_password(payload.password, user.password_hash):
        raise AppError("Invalid email or password", code="invalid_credentials", status_code=401)

    # Generate tokens
    csrf_token = generate_csrf_token()
    session_token = create_signed_session_token(user.id, user.role, csrf_token)

    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=86400 * 7,
        domain=settings.cookie_domain if settings.cookie_domain else None,
        httponly=True,
        secure=True,
        samesite="lax"
    )

    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        csrf_token=csrf_token
    )


@router.post("/logout")
def logout(response: Response) -> dict[str, str]:
    """Log out a user by clearing the session cookie."""
    response.delete_cookie(
        key="session_token",
        domain=settings.cookie_domain if settings.cookie_domain else None,
        httponly=True,
        secure=True,
        samesite="lax"
    )
    return {"detail": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:  # noqa: B008
    """Get the currently logged-in user."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        csrf_token=getattr(current_user, "_csrf_token", None)
    )
