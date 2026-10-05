# Service for creating registrations, including phone normalization and validation.
from __future__ import annotations

from datetime import datetime, UTC, date
from typing import Literal

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.config import settings as app_settings
from app.core.database import get_db
from app.core.exceptions import AppError
from app.models.registration import Registration
from app.models.settings import Settings
from app.schemas.registration import RegistrationCreate
from app.services.otp import (
    _check_ip_rate_limit,
    ensure_utc,
    verify_otp_token,
)
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

    # IP Rate limit
    ip_address   = request.client.host if request.client else "unknown"
    _check_ip_rate_limit(ip_address)

    # 2. Check if registration is open
    db_settings = db.get(Settings, 1)
    if not db_settings or not db_settings.registration_open:
        raise AppError("Registration is currently closed", code="registration_closed", status_code=403)
    if db_settings.registration_closes_at and datetime.now(UTC) >= ensure_utc(db_settings.registration_closes_at):
        raise AppError("Registration is currently closed", code="registration_closed", status_code=403)

    phone_e164 = normalize_phone(payload.phone)

    # 3. OTP check
    if db_settings.otp_enabled:
        if not payload.otp_token:
            raise AppError("OTP token is required", code="otp_required", status_code=400)
        verified_phone = verify_otp_token(payload.otp_token)
        if verified_phone != phone_e164:
            raise AppError("OTP token does not match the provided phone number", code="phone_mismatch", status_code=400)

    # 4. Check if the phone number is already registered
    existing = db.query(Registration).filter(Registration.phone_e164 == phone_e164).first()
    if existing:
        # Resend SMS with ticket code and return success without revealing data
        url = f"{app_settings.frontend_origin}/ticket/{existing.ticket_token}"
        message = f"Hi {existing.first_name.upper()}!\nYou have already registered for IYC 2026. Your ticket code is {existing.ticket_code}. You can view your ticket here: {url}"
        send_sms(db, existing.phone_e164, "registration_duplicate", message)

        return existing, True

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
        invitation_by_someone=payload.invitation_by_someone,
        invitation_by_who=payload.invitation_by_who,
        phone_e164=phone_e164,
        church=payload.church,
        attended_before=payload.attended_before,
        ticket_code=ticket_code,
        ticket_token=ticket_token,
        age=age,
        source="online",
        phone_verified_at=datetime.now(UTC) if db_settings.otp_enabled else None,
    )

    db.add(reg)
    db.commit()
    db.refresh(reg)

    # 7. Send SMS
    url = f"{app_settings.frontend_origin}/ticket/{reg.ticket_token}"
    message = f"Hi {reg.first_name.upper()}!\nRegistration successful! Your IYC-2026 ticket code is {reg.ticket_code}. You can view your ticket here: {url}"
    send_sms(db, reg.phone_e164, "registration_success", message)
    return reg, False



def calculate_age(date_of_birth: date) -> int:
    """Calculate age based on date of birth."""
    today = datetime.now(UTC).date()
    age = today.year - date_of_birth.year - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))
    return age