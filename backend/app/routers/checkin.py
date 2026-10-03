from datetime import datetime, timezone
import phonenumbers
from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_volunteer, verify_csrf
from app.core.exceptions import AppError
from app.models.registration import Registration
from app.models.user import User
from app.schemas.checkin import (
    CheckinLookupResponse,
    CheckinConfirmResponse,
    WalkInRegistrationCreate,
)

router = APIRouter(prefix="/checkin", tags=["checkin"], dependencies=[Depends(require_volunteer)])

@router.get("/lookup/{code}", response_model=CheckinLookupResponse)
def lookup_registration(code: str, db: Session = Depends(get_db)):
    """Lookup a registration by ticket code."""
    reg = db.execute(select(Registration).where(Registration.ticket_code == code.upper())).scalar_one_or_none()
    if not reg:
        raise AppError("Ticket not found.", code="not_found", status_code=404)
    return reg

@router.get("/search", response_model=list[CheckinLookupResponse])
def search_registrations(q: str, db: Session = Depends(get_db)):
    """Search for registrations by name, phone, or code."""
    search_term = f"%{q}%"
    
    # Try normalizing as phone
    phone_search = q
    try:
        parsed = phonenumbers.parse(q, "GH")
        if phonenumbers.is_valid_number(parsed):
            phone_search = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException:
        pass
        
    regs = db.execute(
        select(Registration)
        .where(
            or_(
                Registration.full_name.ilike(search_term),
                Registration.phone_e164.ilike(f"%{phone_search}%"),
                Registration.ticket_code.ilike(search_term)
            )
        )
        .order_by(Registration.full_name)
        .limit(20)
    ).scalars().all()
    return regs

@router.post("/confirm/{code}", response_model=CheckinConfirmResponse, dependencies=[Depends(verify_csrf)])
def confirm_checkin(code: str, db: Session = Depends(get_db), current_user: User = Depends(require_volunteer)):
    """Confirm check-in for a ticket."""
    reg = db.execute(select(Registration).where(Registration.ticket_code == code.upper())).scalar_one_or_none()
    if not reg:
        raise AppError("Ticket not found.", code="not_found", status_code=404)
        
    if reg.checked_in_at:
        raise AppError(f"Already checked in at {reg.checked_in_at.strftime('%Y-%m-%d %H:%M:%S')}", code="already_checked_in", status_code=400)
        
    reg.checked_in_at = datetime.now(timezone.utc)
    reg.checked_in_by = current_user.id
    
    db.commit()
    db.refresh(reg)
    
    return CheckinConfirmResponse(
        detail="Check-in confirmed successfully.",
        checked_in_at=reg.checked_in_at
    )

@router.post("/walk-in", response_model=CheckinLookupResponse, dependencies=[Depends(verify_csrf)])
def walk_in_registration(
    payload: WalkInRegistrationCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_volunteer)
):
    """Register and check in a walk-in attendee immediately."""
    try:
        parsed_phone = phonenumbers.parse(payload.phone, "GH")
        if not phonenumbers.is_valid_number(parsed_phone):
            raise AppError("Invalid phone number format.", code="invalid_phone", status_code=400)
        e164_phone = phonenumbers.format_number(parsed_phone, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException:
        raise AppError("Could not parse phone number.", code="invalid_phone", status_code=400)

    # Check for existing
    existing = db.execute(select(Registration).where(Registration.phone_e164 == e164_phone)).scalar_one_or_none()
    if existing:
        raise AppError(
            "This phone number is already registered. Please search and check in the existing record instead.", 
            code="already_registered", 
            status_code=400
        )
        
    # Generate ticket code (simple implementation matching registration.py)
    import secrets
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    while True:
        code = "".join(secrets.choice(alphabet) for _ in range(8))
        if not db.execute(select(Registration).where(Registration.ticket_code == code)).scalar_one_or_none():
            break
            
    token = secrets.token_urlsafe(16)
    
    reg = Registration(
        full_name=payload.full_name,
        phone_e164=e164_phone,
        church=payload.church,
        attended_before=payload.attended_before,
        ticket_code=code,
        ticket_token=token,
        source="walk_in",
        phone_verified_at=datetime.now(timezone.utc), # Assumed verified since staff is present
        checked_in_at=datetime.now(timezone.utc),
        checked_in_by=current_user.id
    )
    
    db.add(reg)
    db.commit()
    db.refresh(reg)
    
    return reg
