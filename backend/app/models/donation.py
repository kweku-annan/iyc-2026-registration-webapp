"""Donation model — Paystack transactions."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Donation(Base):
    __tablename__ = "donations"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Paystack transaction reference (unique per transaction).
    reference: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    # Amount in the currency's smallest subunit (e.g. pesewas for GHS).
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    # Fixed to "GHS" for now.
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="GHS")
    # status: "pending" | "success" | "failed"
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    is_anonymous: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Nullable — anonymous donors provide no name.
    donor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Nullable — Paystack requires an email; use a generic placeholder for anonymous donors.
    donor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    # Set when the Paystack webhook confirms payment.
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<Donation id={self.id} ref={self.reference!r} status={self.status!r}>"
