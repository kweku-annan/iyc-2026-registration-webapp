"""Security utilities: password hashing and signed tokens."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import settings
from app.core.exceptions import AppError

ph = PasswordHasher()


def hash_password(password: str) -> str:
    """Hash a plaintext password using argon2."""
    return ph.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """Verify a plaintext password against an argon2 hash."""
    try:
        return ph.verify(hashed, password)
    except VerifyMismatchError:
        return False


def generate_csrf_token() -> str:
    """Generate a random CSRF token."""
    return secrets.token_urlsafe(32)


def create_signed_session_token(user_id: int, role: str, csrf_token: str, expires_in: int = 86400 * 7) -> str:
    """Create a signed session token encoding the user context."""
    expires_at = int(time.time()) + expires_in
    payload = {
        "sub": user_id,
        "role": role,
        "csrf": csrf_token,
        "exp": expires_at
    }

    payload_bytes = json.dumps(payload).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("utf-8").rstrip("=")

    signature = hmac.new(
        settings.secret_key.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    return f"{payload_b64}.{signature}"


def verify_signed_session_token(token: str) -> dict[str, Any]:
    """Verify and decode a signed session token.

    Raises:
        AppError: If the token is invalid or expired.
    """
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError:
        raise AppError("Invalid session token format.", code="invalid_token", status_code=401) from None

    expected_signature = hmac.new(
        settings.secret_key.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    if not secrets.compare_digest(signature, expected_signature):
        raise AppError("Invalid session signature.", code="invalid_signature", status_code=401)

    padding = "=" * (4 - len(payload_b64) % 4)
    try:
        payload_bytes = base64.urlsafe_b64decode(payload_b64 + padding)
        payload = json.loads(payload_bytes)
    except (ValueError, TypeError, json.JSONDecodeError):
        raise AppError("Invalid session payload.", code="invalid_payload", status_code=401) from None

    if payload.get("exp", 0) < time.time():
        raise AppError("Session expired.", code="session_expired", status_code=401)

    return payload
