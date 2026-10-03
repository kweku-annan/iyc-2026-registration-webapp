"""Testimonial model — attendee-submitted testimonies with three privacy modes."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Testimonial(Base):
    __tablename__ = "testimonials"

    id: Mapped[int] = mapped_column(primary_key=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)

    # privacy_mode determines what name is shown publicly:
    #   "public"                  → display_name shown
    #   "anonymous_name_private"  → private_name stored, alias_name shown
    #   "anonymous_no_name"       → no name stored, alias_name shown
    privacy_mode: Mapped[str] = mapped_column(String(30), nullable=False)

    # Only populated when privacy_mode == "public".
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Only populated when privacy_mode == "anonymous_name_private".
    # NEVER returned by public endpoints — enforced at the schema / endpoint level.
    private_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Generated random first name for both anonymous modes; shown as "<alias> (Anonymous)".
    alias_name: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Link to the registration that prompted this testimony (nullable — anyone can submit).
    registration_id: Mapped[int | None] = mapped_column(
        ForeignKey("registrations.id", ondelete="SET NULL"), nullable=True
    )

    # Consent must be true at submission time.
    consent: Mapped[bool] = mapped_column(Boolean, nullable=False)

    # status: "pending" | "approved" | "rejected"
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    # Featured testimonies appear on the landing page carousel.
    featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # String-based forward reference — no circular imports.
    registration: Mapped[list] = relationship("Registration", back_populates="testimonials")

    def __repr__(self) -> str:
        return f"<Testimonial id={self.id} status={self.status!r} featured={self.featured}>"
