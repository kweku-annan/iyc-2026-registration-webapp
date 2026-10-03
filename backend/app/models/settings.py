"""Settings model — single-row application config table."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Settings(Base):
    """Always exactly one row (id = 1). Use get_settings() helper to fetch it."""

    __tablename__ = "settings"
    __table_args__ = (
        # Enforce the single-row invariant at the DB level.
        CheckConstraint("id = 1", name="ck_settings_single_row"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    registration_open: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Default: end of 26 Dec 2026 Africa/Accra (UTC+0 = same as UTC).
    registration_closes_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    event_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    event_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    otp_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return (
            f"<Settings registration_open={self.registration_open} "
            f"closes_at={self.registration_closes_at}>"
        )
