"""Registration related Pydantic schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class RegistrationStatusResponse(BaseModel):
    is_open: bool = Field(..., description="Whether registration is currently open")


class RegistrationCreate(BaseModel):
    first_name: str = Field(..., min_length=2, max_length=150, description="Full name of registrant")
    last_name: str = Field(..., min_length=2, max_length=150, description="Last name of registrant")
    other_names: str | None = Field(None, min_length=2, max_length=150, description="Other names of registrant")
    date_of_birth: str = Field(..., description="Date of birth in YYYY-MM-DD format")
    profession: str = Field(..., min_length=2, max_length=150, description="Profession of registrant")
    student_status: bool = Field(..., description="Whether the registrant is a student")
    school_name: str | None = Field(None, min_length=2, max_length=150, description="Name of the school if student_status is True")
    invitation_by_someone: bool = Field(..., description="Whether the registrant was invited by someone")
    invitation_by_who: str | None = Field(None, min_length=2, max_length=150, description="Name of the person who invited the registrant if invitation_by_someone is True")
    phone: str = Field(..., description="Phone number")
    church: str = Field(..., min_length=2, max_length=150, description="Name of the church")
    attended_before: bool = Field(..., description="Has the person attended IYC before?")

    # Honeypot field for bot protection (must be empty or omitted)
    website: str = Field("", description="Honeypot field for bots. Must be empty.")

    # Optional if OTP is globally disabled, but required if enabled.
    otp_token: str | None = Field(None, description="Signed OTP token proving phone verification")

    model_config = ConfigDict(from_attributes=True)


class TicketResponse(BaseModel):
    full_name: str
    ticket_code: str
    ticket_token: str

    model_config = ConfigDict(from_attributes=True)
