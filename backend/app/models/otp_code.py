"""OTP code model — one active OTP per phone number at a time."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class OtpCode(Base):
    __tablename__ = "otp_codes"

    # phone_e164 is the PK: there is at most one active OTP per phone.
    # Upsert on send; delete on verify or expiry.
    phone_e164: Mapped[str] = mapped_column(String(20), primary_key=True)
    # Only the hash (argon2 or sha256 with salt) is stored — never the plaintext.
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # Incremented on each failed verify attempt; rejected after max_attempts.
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<OtpCode phone={self.phone_e164!r} expires={self.expires_at}>"
