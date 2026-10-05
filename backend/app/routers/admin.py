"""Admin API endpoints for organizers."""

from __future__ import annotations

import csv
import io
from typing import Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_organizer, verify_csrf
from app.core.exceptions import AppError
from app.models.registration import Registration
from app.models.settings import Settings
from app.models.testimonial import Testimonial
from app.models.partner import Partner
from app.models.donation import Donation
from app.models.user import User
from app.core.security import hash_password
from app.schemas.admin import (
    AdminRegistrationResponse,
    AdminStatsResponse,
    PaginatedRegistrations,
    SettingsUpdate,
    UserAdminResponse,
    UserCreate,
    UserUpdate,
)
from app.schemas.partner import Partner as PartnerSchema, PartnerCreate, PartnerUpdate
from app.schemas.testimonial import TestimonialAdmin, TestimonialUpdate
from app.schemas.donation import DonationAdminResponse

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_organizer)])


@router.get("/stats", response_model=AdminStatsResponse)
def get_stats(db: Session = Depends(get_db)) -> AdminStatsResponse:  # noqa: B008
    """Get dashboard stats."""
    total_registered = db.query(func.count(Registration.id)).scalar() or 0
    checked_in = db.query(func.count(Registration.id)).filter(Registration.checked_in_at.is_not(None)).scalar() or 0
    walk_ins = db.query(func.count(Registration.id)).filter(Registration.source == "walk_in").scalar() or 0
    pending_testimonials = db.query(func.count(Testimonial.id)).filter(Testimonial.status == "pending").scalar() or 0
    
    # Donations stats
    donations_success_count = db.query(func.count(Donation.id)).filter(Donation.status == "success").scalar() or 0
    donations_amount_minor = db.query(func.sum(Donation.amount_minor)).filter(Donation.status == "success").scalar() or 0

    return AdminStatsResponse(
        total_registered=total_registered,
        checked_in=checked_in,
        walk_ins=walk_ins,
        pending_testimonials=pending_testimonials,
        donations_success=donations_success_count,
        donations_amount_minor=donations_amount_minor
    )


@router.get("/registrations", response_model=PaginatedRegistrations)
def get_registrations(
    search: str = "",
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)  # noqa: B008
) -> PaginatedRegistrations:
    """Get a paginated list of registrations with optional search."""
    query = db.query(Registration)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Registration.first_name.ilike(search_pattern),
                Registration.last_name.ilike(search_pattern),
                Registration.phone_e164.ilike(search_pattern),
                Registration.ticket_code.ilike(search_pattern)
            )
        )

    total = query.count()
    items = query.order_by(Registration.registered_at.desc()).offset(skip).limit(limit).all()

    # We use model_validate inside a list comp, but returning a dict works with FastAPI's serialization
    return PaginatedRegistrations(
        items=[AdminRegistrationResponse.model_validate(item) for item in items],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/registrations/export.csv")
def export_registrations_csv(db: Session = Depends(get_db)) -> StreamingResponse:  # noqa: B008
    """Export all registrations as a CSV file."""
    registrations = db.query(Registration).order_by(Registration.registered_at.desc()).all()

    # Use StringIO to hold CSV data
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "ID", "Full Name", "Phone (E.164)", "Church", "Attended Before",
        "Ticket Code", "Source", "Registered At", "Verified At", "Checked In At"
    ])

    # Rows
    for reg in registrations:
        writer.writerow([
            reg.id,
            reg.first_name,
            reg.last_name,
            reg.other_names or "",
            reg.date_of_birth,
            reg.profession,
            "Yes" if reg.student_status else "No",
            reg.school_name or "",
            "Yes" if reg.invitation_by_someone else "No",
            reg.invitation_by_who or "",
            reg.phone_e164,
            reg.church,
            "Yes" if reg.attended_before else "No",
            reg.ticket_code,
            reg.source,
            reg.registered_at.isoformat() if reg.registered_at else "",
            reg.phone_verified_at.isoformat() if reg.phone_verified_at else "",
            reg.checked_in_at.isoformat() if reg.checked_in_at else ""
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=iyc-2026-registrations.csv"}
    )


@router.patch("/settings", dependencies=[Depends(verify_csrf)])
def update_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db)  # noqa: B008
) -> dict[str, Any]:
    """Update global settings like registration close time."""
    settings_row = db.get(Settings, 1)
    if not settings_row:
        raise AppError("Settings row not found.", code="not_found", status_code=404)

    if payload.registration_open is not None:
        settings_row.registration_open = payload.registration_open
    if payload.registration_closes_at is not None:
        settings_row.registration_closes_at = payload.registration_closes_at

    db.commit()
    return {"detail": "Settings updated"}


@router.delete("/registrations/{reg_id}", dependencies=[Depends(verify_csrf)])
def anonymize_registration(
    reg_id: int,
    db: Session = Depends(get_db)  # noqa: B008
) -> dict[str, str]:
    """Anonymize a registration per privacy request."""
    reg = db.get(Registration, reg_id)
    if not reg:
        raise AppError("Registration not found", code="not_found", status_code=404)

    # Overwrite PII, keeping structural integrity
    reg.first_name = "Anonymized User"
    reg.phone_e164 = f"anon-{reg.ticket_code}"
    reg.church = "Anonymized"

    db.commit()
    return {"detail": f"Registration {reg.ticket_code} anonymized successfully"}


@router.get("/testimonials", response_model=list[TestimonialAdmin])
def get_admin_testimonials(
    db: Session = Depends(get_db)  # noqa: B008
):
    """List all testimonials for moderation."""
    stmt = select(Testimonial).order_by(Testimonial.created_at.desc())
    return db.execute(stmt).scalars().all()


@router.patch("/testimonials/{t_id}", response_model=TestimonialAdmin, dependencies=[Depends(verify_csrf)])
def update_testimonial(
    t_id: int,
    payload: TestimonialUpdate,
    db: Session = Depends(get_db)  # noqa: B008
):
    """Approve/Reject or feature a testimonial."""
    testimonial = db.get(Testimonial, t_id)
    if not testimonial:
        raise AppError("Testimonial not found", code="not_found", status_code=404)

    if payload.status is not None:
        testimonial.status = payload.status
    if payload.featured is not None:
        testimonial.featured = payload.featured

    db.commit()
    db.refresh(testimonial)
    return testimonial

# ── Partners ──────────────────────────────────────────────────────────────────

@router.get("/partners", response_model=list[PartnerSchema])
def get_admin_partners(db: Session = Depends(get_db)):  # noqa: B008
    """List all partners, including inactive."""
    stmt = select(Partner).order_by(Partner.sort_order.asc(), Partner.name.asc())
    return db.execute(stmt).scalars().all()

@router.post("/partners", response_model=PartnerSchema, dependencies=[Depends(verify_csrf)])
def create_partner(
    payload: PartnerCreate,
    db: Session = Depends(get_db)  # noqa: B008
):
    """Create a new partner."""
    partner = Partner(
        name=payload.name,
        logo_url=payload.logo_url,
        website_url=payload.website_url,
        location=payload.location,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    db.add(partner)
    db.commit()
    db.refresh(partner)
    return partner

@router.patch("/partners/{p_id}", response_model=PartnerSchema, dependencies=[Depends(verify_csrf)])
def update_partner(
    p_id: int,
    payload: PartnerUpdate,
    db: Session = Depends(get_db)  # noqa: B008
):
    """Update a partner."""
    partner = db.get(Partner, p_id)
    if not partner:
        raise AppError("Partner not found", code="not_found", status_code=404)
        
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(partner, key, value)
        
    db.commit()
    db.refresh(partner)
    return partner

@router.delete("/partners/{p_id}", dependencies=[Depends(verify_csrf)])
def delete_partner(
    p_id: int,
    db: Session = Depends(get_db)  # noqa: B008
):
    """Delete a partner."""
    partner = db.get(Partner, p_id)
    if not partner:
        raise AppError("Partner not found", code="not_found", status_code=404)
        
    db.delete(partner)
    db.commit()
    return {"detail": "Partner deleted"}

# ── Donations ─────────────────────────────────────────────────────────────────

@router.get("/donations", response_model=list[DonationAdminResponse])
def get_admin_donations(db: Session = Depends(get_db)):  # noqa: B008
    """List all donations."""
    stmt = select(Donation).order_by(Donation.created_at.desc())
    return db.execute(stmt).scalars().all()

# ── Donations ─────────────────────────────────────────────────────────────────

@router.get("/donations", response_model=list[DonationAdminResponse])
def get_admin_donations(db: Session = Depends(get_db)):  # noqa: B008
    """List all donations."""
    stmt = select(Donation).order_by(Donation.created_at.desc())
# ── Users (Organizers & Volunteers) ───────────────────────────────────────────

@router.get("/users", response_model=list[UserAdminResponse])
def get_admin_users(db: Session = Depends(get_db)):  # noqa: B008
    """List all staff users."""
    return db.execute(select(User).order_by(User.created_at.desc())).scalars().all()

@router.post("/users", response_model=UserAdminResponse, dependencies=[Depends(verify_csrf)])
def create_admin_user(
    payload: UserCreate,
    db: Session = Depends(get_db)  # noqa: B008
):
    """Create a new staff user."""
    # Check if email exists
    if db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none():
        raise AppError("User with this email already exists.", code="email_exists", status_code=400)

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.patch("/users/{u_id}", response_model=UserAdminResponse, dependencies=[Depends(verify_csrf)])
def update_admin_user(
    u_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db)  # noqa: B008
):
    """Update a staff user (role, status, reset password)."""
    user = db.get(User, u_id)
    if not user:
        raise AppError("User not found", code="not_found", status_code=404)

    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password is not None and payload.password.strip():
        user.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{u_id}", dependencies=[Depends(verify_csrf)])
def delete_admin_user(
    u_id: int,
    db: Session = Depends(get_db)  # noqa: B008
):
    """Delete a staff user if they haven't checked anyone in."""
    user = db.get(User, u_id)
    if not user:
        raise AppError("User not found", code="not_found", status_code=404)

    # Check if they have checked anyone in
    checked_in_count = db.execute(
        select(func.count(Registration.id)).where(Registration.checked_in_by == u_id)
    ).scalar() or 0

    if checked_in_count > 0:
        raise AppError(
            "Cannot delete a user who has checked in attendees. Please deactivate their account instead.", 
            code="user_has_history", 
            status_code=400
        )

    db.delete(user)
    db.commit()
    return {"detail": "User deleted"}
