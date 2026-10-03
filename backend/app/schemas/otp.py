"""Pydantic schemas for OTP endpoints."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class OtpSendRequest(BaseModel):
    phone: str = Field(..., description="Phone number to send OTP to")

    model_config = ConfigDict(from_attributes=True)


class OtpVerifyRequest(BaseModel):
    phone: str = Field(..., description="Phone number the OTP was sent to")
    code: str = Field(..., description="6-digit OTP code")

    model_config = ConfigDict(from_attributes=True)


class OtpVerifyResponse(BaseModel):
    detail: str = "OTP verified"
    token: str = Field(..., description="Signed token proving phone verification")
