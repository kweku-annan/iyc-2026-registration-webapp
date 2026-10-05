"""OTP (One-Time Password) service.

Handles sending and verifying OTP codes, including rate limiting (IP and phone),
expiry, max attempts, and hashing (argon2).
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import time
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from dataclasses import dataclass

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.registration import Registration
from app.core.exceptions import AppError, RateLimitError
from app.models.otp_code import OtpCode
from app.models.sms_log import SmsLog
from app.services.sms import send_sms

# ── Configuration ─────────────────────────────────────────────────────────────
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 10
OTP_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 3
OTP_MAX_PER_PHONE_PER_DAY = 3

# Simple in-memory IP rate limit: 5 requests per IP per 5 minutes.
IP_RATE_LIMIT_MAX = 5
IP_RATE_LIMIT_WINDOW_SECONDS = 300

# Tracker format: IP -> list of timestamps
_ip_tracker: dict[str, list[float]] = defaultdict(list)

# Use argon2 for secure hashing
ph = PasswordHasher()


@dataclass(frozen=True)
class OtpSendResult:
    detail: str
    already_registered: bool


def ensure_utc(dt: datetime) -> datetime:
    """Ensure a datetime object is UTC aware (fixes SQLite stripping timezones)."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


def _check_ip_rate_limit(ip_address: str) -> None:
    """Enforce IP rate limit (in-memory)."""
    now = time.time()

    # Filter timestamps within the window
    _ip_tracker[ip_address] = [
        t for t in _ip_tracker[ip_address]
        if now - t < IP_RATE_LIMIT_WINDOW_SECONDS
    ]

    if len(_ip_tracker[ip_address]) >= IP_RATE_LIMIT_MAX:
        raise RateLimitError("Too many requests from this IP. Please try again later.")

    _ip_tracker[ip_address].append(now)


def send_otp(db: Session, phone_e164: str, ip_address: str) -> OtpSendResult:
    """Send an OTP code to the given phone number or resend the ticket SMS for an existing registration, enforcing limits.

    Args:
        db: SQLAlchemy session.
        phone_e164: Normalized E.164 phone number.
        ip_address: Client IP address (for rate limiting).

    Raises:
        RateLimitError: If IP rate limit, phone daily limit, or cooldown is hit.
    """
    _check_ip_rate_limit(ip_address)

    now = datetime.now(UTC)

    existing_registration = (
        db.query(Registration)
        .filter(Registration.phone_e164 == phone_e164)
        .first()
    )

    if existing_registration:
        # Resend SMS with ticket code and return success without revealing data
        url = f"{settings.frontend_origin}/ticket/{existing_registration.ticket_token}"
        message = f"Hi {existing_registration.first_name.upper()}!\nYou have already registered for IYC 2026. Your ticket code is {existing_registration.ticket_code}. You can view your ticket here: {url}"
        send_sms(
            db=db,
            to_phone=existing_registration.phone_e164,
            template="registration_duplicate",
            message=message,
            registration_id=existing_registration.id
        )
        return OtpSendResult(
            detail="You have already registered. Your ticket number has been sent to you via SMS.",
            already_registered=True
        )

    # Check cooldown (60 seconds)
    existing = db.get(OtpCode, phone_e164)
    if existing:
        seconds_since_creation = (now - ensure_utc(existing.created_at)).total_seconds()
        if seconds_since_creation < OTP_COOLDOWN_SECONDS:
            raise RateLimitError("Please wait 1 minute before requesting another code.")

    # Check phone daily limit
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    sms_count = db.query(func.count(SmsLog.id)).filter(
        SmsLog.to_phone == phone_e164,
        SmsLog.template == "otp",
        SmsLog.created_at >= today
    ).scalar() or 0

    if sms_count >= OTP_MAX_PER_PHONE_PER_DAY:
        raise RateLimitError("Daily SMS limit reached for this phone number.")

    # Generate 6-digit code
    code = "".join(secrets.choice("0123456789") for _ in range(OTP_LENGTH))
    code_hash = ph.hash(code)
    expires_at = now + timedelta(minutes=OTP_EXPIRY_MINUTES)

    # Upsert OtpCode
    if existing:
        existing.code_hash = code_hash
        existing.expires_at = expires_at
        existing.attempts = 0
        existing.created_at = now
    else:
        new_otp = OtpCode(
            phone_e164=phone_e164,
            code_hash=code_hash,
            expires_at=expires_at,
            attempts=0,
            created_at=now,
        )
        db.add(new_otp)

    db.commit()

    # Send SMS (this writes an SmsLog with template="otp")
    message = f"Your IYC-2026 verification code is {code}. It expires in {OTP_EXPIRY_MINUTES} minutes."
    send_sms(
        db=db,
        to_phone=phone_e164,
        template="otp",
        message=message,
        registration_id=None
    )
    return OtpSendResult(
        detail="OTP code sent successfully. Please check your SMS messages.",
        already_registered=False
    )


def generate_otp_token(phone_e164: str) -> str:
    """Generate a signed, short-lived token proving the phone was verified.

    Valid for 30 minutes.
    """
    expires_at = int(time.time()) + (30 * 60)
    payload = f"{phone_e164}.{expires_at}"
    signature = hmac.new(
        settings.secret_key.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return f"{payload}.{signature}"


def verify_otp_token(token: str) -> str:
    """Verify the signed OTP token and return the phone number.

    Raises:
        AppError: If the token is invalid, tampered with, or expired.
    """
    try:
        phone_e164, expires_str, signature = token.split(".")
        expires_at = int(expires_str)
    except ValueError:
        raise AppError("Invalid OTP token.", code="invalid_token", status_code=400) from None

    expected_payload = f"{phone_e164}.{expires_at}"
    expected_signature = hmac.new(
        settings.secret_key.encode("utf-8"),
        expected_payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_signature):
        raise AppError("Invalid OTP token signature.", code="invalid_token", status_code=400)

    if time.time() > expires_at:
        raise AppError("OTP token has expired. Please verify your phone again.", code="token_expired", status_code=400)

    return phone_e164


def verify_otp(db: Session, phone_e164: str, code: str) -> str:
    """Verify an OTP code for the given phone number and return a signed token.

    Args:
        db: SQLAlchemy session.
        phone_e164: Normalized E.164 phone number.
        code: 6-digit OTP code provided by the user.

    Raises:
        AppError (400/403): If the OTP is invalid, expired, or max attempts reached.
    """
    otp = db.get(OtpCode, phone_e164)
    if not otp:
        raise AppError("No active OTP found for this phone number.", code="otp_not_found", status_code=400)

    # Check expiry
    if datetime.now(UTC) > ensure_utc(otp.expires_at):
        db.delete(otp)
        db.commit()
        raise AppError("OTP has expired. Please request a new one.", code="otp_expired", status_code=400)

    # Check max attempts
    if otp.attempts >= OTP_MAX_ATTEMPTS:
        db.delete(otp)
        db.commit()
        raise AppError("Too many invalid attempts. Please request a new code.", code="otp_max_attempts", status_code=403)

    # Verify hash
    try:
        ph.verify(otp.code_hash, code)
    except VerifyMismatchError:
        otp.attempts += 1
        db.commit()
        raise AppError("Invalid OTP code.", code="otp_invalid", status_code=400) from None

    # Success: delete the OTP so it can't be reused
    db.delete(otp)
    db.commit()

    return generate_otp_token(phone_e164)
