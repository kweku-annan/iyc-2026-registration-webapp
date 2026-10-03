"""Registration endpoints including OTP flow."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.config import settings as app_settings
from app.core.database import get_db
from app.core.exceptions import AppError
from app.models.registration import Registration
from app.models.settings import Settings
from app.schemas.otp import OtpSendRequest, OtpVerifyRequest, OtpVerifyResponse
from app.schemas.registration import RegistrationCreate, RegistrationStatusResponse
from app.services.otp import (
    _check_ip_rate_limit,
    ensure_utc,
    send_otp,
    verify_otp,
    verify_otp_token,
)
from app.services.phones import normalize_phone
from app.services.sms import send_sms
from app.services.tickets import generate_ticket_token, generate_unique_ticket_code

router = APIRouter(prefix="/registrations", tags=["registrations"])


@router.get("/status", response_model=RegistrationStatusResponse)
def get_registration_status(db: Session = Depends(get_db)) -> RegistrationStatusResponse:  # noqa: B008
    """Check if registration is currently open."""
    db_settings = db.get(Settings, 1)
    if not db_settings:
        return RegistrationStatusResponse(is_open=False)

    is_open = db_settings.registration_open
    if is_open and db_settings.registration_closes_at and datetime.now(UTC) >= ensure_utc(db_settings.registration_closes_at):
            is_open = False

    return RegistrationStatusResponse(is_open=is_open)


@router.post("/otp/send")
def request_otp(
    request: Request,
    payload: OtpSendRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> dict[str, str]:
    """Send an OTP code to a phone number.

    Does not reveal if the phone is already registered.
    """
    ip_address = request.client.host if request.client else "unknown"
    phone_e164 = normalize_phone(payload.phone)
    send_otp(db, phone_e164, ip_address)
    return {"detail": "OTP requested"}


@router.post("/otp/verify", response_model=OtpVerifyResponse)
def verify_otp_endpoint(
    payload: OtpVerifyRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> OtpVerifyResponse:
    """Verify an OTP code."""
    phone_e164 = normalize_phone(payload.phone)
    token = verify_otp(db, phone_e164, payload.code)
    return OtpVerifyResponse(token=token)


@router.post("", response_model=dict[str, str])
def create_registration(
    request: Request,
    payload: RegistrationCreate,
    db: Session = Depends(get_db),  # noqa: B008
) -> dict[str, str]:
    """Submit a registration."""
    # 1. Honeypot check
    if payload.website:
        raise AppError("Invalid submission.", code="invalid_submission", status_code=400)

    # 2. IP Rate limit
    ip_address = request.client.host if request.client else "unknown"
    _check_ip_rate_limit(ip_address)

    # 3. Status check
    db_settings = db.get(Settings, 1)
    if not db_settings or not db_settings.registration_open:
        raise AppError("Registration is currently closed.", code="registration_closed", status_code=403)
    if db_settings.registration_closes_at and datetime.now(UTC) >= ensure_utc(db_settings.registration_closes_at):
        raise AppError("Registration is currently closed.", code="registration_closed", status_code=403)

    phone_e164 = normalize_phone(payload.phone)

    # 4. OTP check
    if db_settings.otp_enabled:
        if not payload.otp_token:
            raise AppError("OTP token is required.", code="otp_required", status_code=400)
        verified_phone = verify_otp_token(payload.otp_token)
        if verified_phone != phone_e164:
            raise AppError("OTP token does not match phone number.", code="phone_mismatch", status_code=400)

    # 5. Duplicate check
    existing = db.query(Registration).filter(Registration.phone_e164 == phone_e164).first()
    if existing:
        # Resend SMS and return success without revealing data
        url = f"{app_settings.frontend_origin}/ticket/{existing.ticket_token}"
        message = f"You're already registered for IYC-2026. Your ticket code is {existing.ticket_code}. View ticket: {url}"
        send_sms(db, existing.phone_e164, "registration_duplicate", message)

        return {"detail": "You're already registered. Your ticket link has been resent via SMS."}

    # 6. Create Registration
    ticket_code = generate_unique_ticket_code(db)
    ticket_token = generate_ticket_token()

    reg = Registration(
        full_name=payload.full_name,
        phone_e164=phone_e164,
        church=payload.church,
        attended_before=payload.attended_before,
        source="online",
        ticket_code=ticket_code,
        ticket_token=ticket_token,
        phone_verified_at=datetime.now(UTC) if db_settings.otp_enabled else None
    )
    db.add(reg)
    db.commit()
    db.refresh(reg)

    # 7. Send SMS
    url = f"{app_settings.frontend_origin}/ticket/{reg.ticket_token}"
    message = f"Registration successful! Your IYC-2026 ticket code is {reg.ticket_code}. View ticket: {url}"
    send_sms(db, reg.phone_e164, "registration_success", message)

    return {"detail": "Registration successful", "ticket_token": reg.ticket_token}
