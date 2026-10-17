# Service for creating registrations, including phone normalization and validation.
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings as app_settings
from app.core.exceptions import AppError, RateLimitError
from app.core.rate_limit import check_ip_rate_limit, get_client_ip, verify_turnstile
from app.models.registration import Registration
from app.models.settings import Settings
from app.models.sms_log import SmsLog
from app.schemas.registration import RegistrationCreate
from app.services.otp import ensure_utc
from app.services.phones import normalize_phone
from app.services.sms import send_sms
from app.services.tickets import generate_ticket_token, generate_unique_ticket_code


def create_registration(
        payload: RegistrationCreate,
        request: Request,
        db: Session,  # noqa: B008
) -> tuple[Registration, Literal[False]] | tuple[Registration, Literal[True]]:
    """Creates a new registration and performs necessary checks and logics"""

    # 1. Honey pot check: Check if this is from a bot
    if payload.website:
        raise AppError("Invalid submission", code="invalid_submission", status_code=400)

    # 2. IP Rate limit (Sliding window + Railway proxy aware)
    ip_address = get_client_ip(request)
    check_ip_rate_limit(ip_address)

    # 3. Cloudflare Turnstile bot verification
    if not verify_turnstile(payload.turnstile_token, ip_address):
        raise AppError(
            "Security verification failed. Please complete the security check and try again.",
            code="turnstile_failed",
            status_code=400,
        )

    # 4. Check if registration is open
    db_settings = db.get(Settings, 1)
    if not db_settings or not db_settings.registration_open:
        raise AppError("Registration is currently closed", code="registration_closed", status_code=403)
    if db_settings.registration_closes_at and datetime.now(UTC) >= ensure_utc(db_settings.registration_closes_at):
        raise AppError("Registration is currently closed", code="registration_closed", status_code=403)

    phone_e164 = normalize_phone(payload.phone)

    # 5. Check if the phone number is already registered
    existing = db.query(Registration).filter(Registration.phone_e164 == phone_e164).first()
    if existing:
        # Cooldown & daily limit check on duplicate SMS resend:
        # Avoid spamming mNotify if user repeatedly submits the same number.
        five_mins_ago = datetime.now(UTC) - timedelta(minutes=5)
        recent_sms = db.query(SmsLog).filter(
            SmsLog.to_phone == existing.phone_e164,
            SmsLog.created_at >= five_mins_ago,
        ).first()

        today = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        daily_count = db.query(func.count(SmsLog.id)).filter(
            SmsLog.to_phone == existing.phone_e164,
            SmsLog.created_at >= today,
        ).scalar() or 0

        if not recent_sms and daily_count < 3:
            url = f"{app_settings.frontend_origin}/ticket/{existing.ticket_token}"
            message = f"Hi {existing.first_name.upper()}!\nYou have already registered for IYC 2026. Your ticket code is {existing.ticket_code}. You can view your ticket here: {url}"
            send_sms(db, existing.phone_e164, "registration_duplicate", message)

        return existing, True

    # 6. Check phone daily limit for new registrations
    today = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    sms_count = db.query(func.count(SmsLog.id)).filter(
        SmsLog.to_phone == phone_e164,
        SmsLog.created_at >= today,
    ).scalar() or 0

    if sms_count >= 3:
        raise RateLimitError("Daily SMS limit reached for this phone number.")

    # 5 Create Registration
    ticket_code = generate_unique_ticket_code(db)
    ticket_token = generate_ticket_token()

    age = calculate_age(payload.date_of_birth)

    reg = Registration(
        first_name=payload.first_name,
        last_name=payload.last_name,
        other_names=payload.other_names,
        date_of_birth=payload.date_of_birth,
        profession=payload.profession,
        student_status=payload.student_status,
        school_name=payload.school_name,
        location=payload.location,
        accommodation_preference=payload.accommodation_preference,
        invitation_by_someone=payload.invitation_by_someone,
        invitation_by_who=payload.invitation_by_who,
        phone_e164=phone_e164,
        email=payload.email,
        church=payload.church,
        attended_before=payload.attended_before,
        ticket_code=ticket_code,
        ticket_token=ticket_token,
        age=age,
        source="online",
        # phone_verified_at is None for online registrations — OTP is disconnected.
        # Walk-in registrations set this explicitly in checkin.py.
        phone_verified_at=None,
    )

    db.add(reg)
    db.commit()
    db.refresh(reg)

    # 7. Send SMS
    url = f"{app_settings.frontend_origin}/ticket/{reg.ticket_token}"
    message = f"Hi {reg.first_name.upper()}!\nRegistration successful! Your IYC-2026 ticket code is {reg.ticket_code}. You can view your ticket here: {url}"
    send_sms(db, reg.phone_e164, "registration_success", message)
    return reg, False



def calculate_age(date_of_birth: str) -> int | None:
    """Calculate age from a date string.

    Accepts:
      - ``YYYY-MM-DD`` — full date; returns integer age.
      - ``MM-DD``      — partial date (year omitted); returns None.
    """
    parts = date_of_birth.split("-")
    if len(parts) == 2:
        # Only MM-DD provided — cannot calculate age
        return None
    # Full date: YYYY-MM-DD
    year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
    today = datetime.now(UTC).date()
    age = today.year - year - ((today.month, today.day) < (month, day))
    return age
