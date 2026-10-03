"""Schemas for the organizer admin API."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AdminStatsResponse(BaseModel):
    """Counts for the dashboard."""
    total_registered: int
    checked_in: int
    walk_ins: int
    pending_testimonials: int
    donations_success: int = 0
    donations_amount_minor: int = 0


class SettingsUpdate(BaseModel):
    """Payload to update site settings."""
    registration_open: bool | None = None
    registration_closes_at: datetime | None = None


class AdminRegistrationResponse(BaseModel):
    """Registration object for the admin table."""
    model_config = {"from_attributes": True}
    id: int
    full_name: str
    phone_e164: str
    church: str
    attended_before: bool
    ticket_code: str
    source: str
    phone_verified_at: datetime | None
    registered_at: datetime
    checked_in_at: datetime | None


class PaginatedRegistrations(BaseModel):
    """Paginated list of registrations."""
    items: list[AdminRegistrationResponse]
    total: int
    skip: int
    limit: int

class UserAdminResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    email: str
    role: str
    is_active: bool
    created_at: datetime

class UserCreate(BaseModel):
    email: str
    password: str
    role: str = "volunteer"

class UserUpdate(BaseModel):
    role: str | None = None
    is_active: bool | None = None
    password: str | None = None
