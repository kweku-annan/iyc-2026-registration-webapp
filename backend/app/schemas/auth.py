"""Authentication schemas."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Payload for POST /auth/login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Response representing a logged-in user."""
    id: int
    email: str
    role: str
    csrf_token: str | None = None
