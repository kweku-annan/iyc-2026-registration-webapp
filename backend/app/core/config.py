"""Application configuration loaded from environment variables.

Fails fast on startup if any required variable is missing.
"""

from __future__ import annotations

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str

    # Security
    secret_key: str

    # CORS / Cookies
    frontend_origin: AnyHttpUrl
    cookie_domain: str

    # Paystack (optional at scaffold stage; required for Phase 2)
    paystack_secret_key: str = ""
    paystack_public_key: str = ""

    # SMS
    sms_provider: str = "console"  # "console" | "mnotify"
    sms_api_key: str = ""
    sms_sender_id: str = "IYC2026"

    # OTP
    otp_enabled: bool = True

    # Locale
    default_phone_region: str = "GH"
    event_timezone: str = "Africa/Accra"

    @field_validator("sms_provider")
    @classmethod
    def validate_sms_provider(cls, v: str) -> str:
        allowed = {"console", "mnotify"}
        if v not in allowed:
            msg = f"SMS_PROVIDER must be one of {allowed}, got {v!r}"
            raise ValueError(msg)
        return v


# Module-level singleton — imported by the rest of the app.
settings = Settings()
