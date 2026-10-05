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
from app.services.registration import create_registration
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
    reg = create_registration(payload, request, db)

    return {"detail": "Registration successful", "ticket_token": reg.ticket_token}
