"""Registration related Pydantic schemas."""

from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class RegistrationStatusResponse(BaseModel):
    is_open: bool = Field(..., description="Whether registration is currently open")


class RegistrationCreate(BaseModel):
    first_name: str = Field(..., min_length=2, max_length=150, description="First name of registrant")
    last_name: str = Field(..., min_length=2, max_length=150, description="Last name of registrant")
    other_names: str | None = Field(None, min_length=2, max_length=150, description="Other names of registrant")
    date_of_birth: str = Field(
        ...,
        description="Date of birth. Full date: YYYY-MM-DD. Partial (year optional): MM-DD.",
    )

    @field_validator("date_of_birth")
    @classmethod
    def validate_date_of_birth(cls, v: str) -> str:
        """Accept YYYY-MM-DD or MM-DD. Reject anything else."""
        full = re.fullmatch(r"\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])", v)
        partial = re.fullmatch(r"(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])", v)
        if not full and not partial:
            raise ValueError(
                "date_of_birth must be YYYY-MM-DD (full) or MM-DD (partial, year omitted)"
            )
        return v
    profession: str = Field(..., min_length=2, max_length=150, description="Profession of registrant")
    student_status: bool = Field(..., description="Whether the registrant is a student")
    school_name: str | None = Field(None, min_length=2, max_length=150, description="Name of the school if student_status is True")
    location: str = Field(..., min_length=2, max_length=150, description="Location or City of the registrant")
    accommodation_preference: str = Field(..., description="Camp Site Accommodation, Hotel, or Hostel")
    invitation_by_someone: bool = Field(..., description="Whether the registrant was invited by someone")
    invitation_by_who: str | None = Field(None, min_length=2, max_length=150, description="Name of the person who invited the registrant if invitation_by_someone is True")
    phone: str = Field(..., description="Phone number")
    # Optional email address — not required or verified.
    email: EmailStr | None = Field(None, description="Optional email address")
    church: str = Field(..., min_length=2, max_length=150, description="Name of the church")
    attended_before: bool = Field(..., description="Has the person attended IYC before?")

    # Honeypot field for bot protection (must be empty or omitted)
    website: str = Field("", description="Honeypot field for bots. Must be empty.")

    # Cloudflare Turnstile token for bot verification (accepts both turnstile_token and cf-turnstile-response)
    turnstile_token: str | None = Field(default=None, description="Cloudflare Turnstile token for bot protection")

    @model_validator(mode="before")
    @classmethod
    def populate_turnstile_token(cls, data: Any) -> Any:
        if isinstance(data, dict) and "cf-turnstile-response" in data and "turnstile_token" not in data:
            data["turnstile_token"] = data["cf-turnstile-response"]
        return data

    # otp_token is intentionally omitted — OTP step is disconnected from the flow.
    # The service and endpoints still exist but are not called during registration.

    model_config = ConfigDict(from_attributes=True)


class TicketResponse(BaseModel):
    first_name: str
    last_name: str
    other_names: str | None
    date_of_birth: str
    age: int | None
    profession: str
    student_status: bool
    school_name: str | None
    location: str
    accommodation_preference: str
    invitation_by_someone: bool
    invitation_by_who: str | None
    church: str
    attended_before: bool
    ticket_code: str
    ticket_token: str
    email: str | None

    model_config = ConfigDict(from_attributes=True)
