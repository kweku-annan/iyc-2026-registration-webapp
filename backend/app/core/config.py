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
    sms_provider: str = "mnotify"  # "console" | "mnotify"
    mnotify_api_key: str = ""
    sms_sender_id: str = "IYC 2026"
    mnotify_endpoint: AnyHttpUrl | str


    # OTP
    otp_enabled: bool = True

    # Cloudflare Turnstile bot protection (optional in dev, active when enabled)
    turnstile_secret_key: str = ""
    turnstile_enabled: bool = False
    turnstile_hostnames: str = ""

    # Locale
    default_phone_region: str = "GH"
    event_timezone: str = "Africa/Accra"

    # Environment — controls whether debug/docs features are exposed.
    # Set to "production" in Railway (or any hosting environment) to disable
    # Swagger UI, ReDoc, and other development-only endpoints.
    environment: str = "development"



    @field_validator("sms_provider")
    @classmethod
    def validate_sms_provider(cls, v: str) -> str:
        allowed = {"console", "mnotify"}
        if v not in allowed:
            msg = f"SMS_PROVIDER must be one of {allowed}, got {v!r}"
            raise ValueError(msg)
        return v

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Reject obviously weak secret keys at startup."""
        if len(v) < 32:  # noqa: PLR2004
            msg = (
                "SECRET_KEY must be at least 32 characters long. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
            raise ValueError(msg)
        return v


# Module-level singleton — imported by the rest of the app.
settings = Settings()
