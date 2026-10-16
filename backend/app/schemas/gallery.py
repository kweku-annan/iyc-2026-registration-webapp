from __future__ import annotations

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, computed_field


class GalleryPhotoUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    caption: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    year: Optional[int] = None
    alt_text: Optional[str] = Field(None, max_length=500)
    is_visible: Optional[bool] = None
    sort_order: Optional[int] = None


class GalleryPhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    title: str
    caption: Optional[str] = ""
    category: str
    year: int
    thumb_url: str
    full_url: str
    width: int
    height: int
    alt_text: Optional[str] = ""
    is_visible: bool
    sort_order: int
    created_at: datetime

    @computed_field
    @property
    def thumb(self) -> str:
        return self.thumb_url

    @computed_field
    @property
    def full(self) -> str:
        return self.full_url

    @computed_field
    @property
    def alt(self) -> str:
        return self.alt_text or f"{self.title} — {self.category} at IYC Camp Meeting"


class GalleryManifestResponse(BaseModel):
    items: List[GalleryPhotoResponse]
    categories: List[str]
