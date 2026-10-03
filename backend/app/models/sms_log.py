"""SMS log — every outbound SMS is recorded here for auditing and debugging."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class SmsLog(Base):
    __tablename__ = "sms_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Nullable — OTP SMSes are sent before a registration exists.
    registration_id: Mapped[int | None] = mapped_column(
        ForeignKey("registrations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    to_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    # Short name identifying which message template was used (e.g. "otp", "confirmation").
    template: Mapped[str] = mapped_column(String(50), nullable=False)
    # "sent" | "failed"
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    # Raw response from the SMS provider (JSON string or error message).
    provider_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # String-based forward reference — no circular imports.
    registration: Mapped[list] = relationship("Registration", back_populates="sms_logs")

    def __repr__(self) -> str:
        return (
            f"<SmsLog id={self.id} to={self.to_phone!r} "
            f"template={self.template!r} status={self.status!r}>"
        )
