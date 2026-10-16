"""Gallery photo model — displayed in homepage gallery and exhibition archive."""

from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class GalleryPhoto(Base):
    __tablename__ = "gallery_photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="Worship & Praise", index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, default=2025)
    thumb_url: Mapped[str] = mapped_column(String(500), nullable=False)
    full_url: Mapped[str] = mapped_column(String(500), nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False, default=1200)
    height: Mapped[int] = mapped_column(Integer, nullable=False, default=900)
    alt_text: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<GalleryPhoto id={self.id} title={self.title!r} category={self.category!r}>"
