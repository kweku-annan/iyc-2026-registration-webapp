"""Gallery router — public exhibition endpoint and admin photo management."""

from __future__ import annotations

import io
import os
import uuid
from typing import IO, List, Optional
from PIL import Image

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy import desc, distinct, func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_organizer, verify_csrf
from app.core.exceptions import AppError
from app.models.gallery import GalleryPhoto
from app.schemas.gallery import (
    GalleryManifestResponse,
    GalleryPhotoResponse,
    GalleryPhotoUpdate,
)

router = APIRouter(prefix="/gallery", tags=["gallery"])
admin_router = APIRouter(prefix="/admin/gallery", tags=["admin-gallery"], dependencies=[Depends(require_organizer)])

# 15 MB limit per uploaded image — prevents server OOM crashes while accommodating high-res photos
_MAX_IMAGE_BYTES = 15 * 1024 * 1024
_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(BACKEND_DIR, "uploads"))
UPLOADS_BASE = os.path.join(UPLOAD_DIR, "gallery")
THUMBS_DIR = os.path.join(UPLOADS_BASE, "thumbs")
FULL_DIR = os.path.join(UPLOADS_BASE, "full")

os.makedirs(THUMBS_DIR, exist_ok=True)
os.makedirs(FULL_DIR, exist_ok=True)


# ── Public Endpoints ──────────────────────────────────────────────────────────

@router.get("", response_model=GalleryManifestResponse)
def get_public_gallery(
    category: Optional[str] = Query(None, description="Optional category filter"),
    db: Session = Depends(get_db),
):
    """Get all published/visible gallery photos ordered by sort_order and date."""
    stmt = (
        select(GalleryPhoto)
        .where(GalleryPhoto.is_visible == True)
        .order_by(GalleryPhoto.sort_order.asc(), GalleryPhoto.created_at.desc(), GalleryPhoto.id.desc())
    )
    if category and category != "All":
        stmt = stmt.where(GalleryPhoto.category == category)

    photos = db.execute(stmt).scalars().all()

    # Get all distinct categories currently present in visible photos
    cat_stmt = (
        select(distinct(GalleryPhoto.category))
        .where(GalleryPhoto.is_visible == True)
        .order_by(GalleryPhoto.category.asc())
    )
    categories = [c for c in db.execute(cat_stmt).scalars().all() if c]

    return GalleryManifestResponse(items=photos, categories=categories)


# ── Admin Endpoints ───────────────────────────────────────────────────────────

@admin_router.get("", response_model=List[GalleryPhotoResponse])
def get_admin_gallery_photos(
    category: Optional[str] = Query(None),
    is_visible: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List all gallery photos for administrators (includes hidden ones)."""
    stmt = select(GalleryPhoto).order_by(
        GalleryPhoto.sort_order.asc(), GalleryPhoto.created_at.desc(), GalleryPhoto.id.desc()
    )

    if category and category != "All":
        stmt = stmt.where(GalleryPhoto.category == category)
    if is_visible is not None:
        stmt = stmt.where(GalleryPhoto.is_visible == is_visible)
    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            (GalleryPhoto.title.ilike(term)) | (GalleryPhoto.caption.ilike(term)) | (GalleryPhoto.category.ilike(term))
        )

    return db.execute(stmt).scalars().all()


@admin_router.post("/upload", response_model=GalleryPhotoResponse, dependencies=[Depends(verify_csrf)])
def upload_gallery_photo(
    file: UploadFile = File(...),
    title: str = Form(...),
    caption: Optional[str] = Form(None),
    category: str = Form("Worship & Praise"),
    year: int = Form(2025),
    alt_text: Optional[str] = Form(None),
    is_visible: bool = Form(True),
    sort_order: int = Form(0),
    db: Session = Depends(get_db),
):
    """Upload and automatically process a new gallery photo without needing code changes.

    - Auto-sanitizes the filename to a semantic slug (iyc2026-photo-<uuid>)
    - Enforces 15 MB image limit
    - Automatically generates high-res (1600px) and thumbnail (500px) WebP images
    - Extracts native width and height for zero layout shifts
    """
    content_type = (file.content_type or "").lower().split(";")[0].strip()
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise AppError(
            f"Unsupported file format. Please upload JPEG, PNG, or WebP. Received: {content_type}",
            code="invalid_file_type",
            status_code=400,
        )

    chunk: IO[bytes] = file.file
    raw_data = chunk.read(_MAX_IMAGE_BYTES + 1)
    if len(raw_data) > _MAX_IMAGE_BYTES:
        raise AppError(
            "Image is too large. Maximum allowed size is 15 MB.",
            code="file_too_large",
            status_code=413,
        )

    # Automated name sanitization: generate unique safe slug
    random_id = uuid.uuid4().hex[:10]
    slug = f"iyc-{year}-{random_id}"
    filename = f"{slug}.webp"

    try:
        im = Image.open(io.BytesIO(raw_data))
        if im.mode in ("RGBA", "P"):
            im = im.convert("RGB")

        full_im = im.copy()
        full_im.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        full_dest = os.path.join(FULL_DIR, filename)
        full_im.save(full_dest, "WEBP", quality=85)

        thumb_im = im.copy()
        thumb_im.thumbnail((500, 500), Image.Resampling.LANCZOS)
        thumb_dest = os.path.join(THUMBS_DIR, filename)
        thumb_im.save(thumb_dest, "WEBP", quality=75)

        w, h = full_im.size
    except Exception as e:
        raise AppError(
            f"Failed to process image file: {str(e)}",
            code="image_processing_error",
            status_code=400,
        )

    photo = GalleryPhoto(
        slug=slug,
        title=title.strip(),
        caption=caption.strip() if caption else None,
        category=category.strip() if category else "Worship & Praise",
        year=year,
        thumb_url=f"/uploads/gallery/thumbs/{filename}",
        full_url=f"/uploads/gallery/full/{filename}",
        width=w,
        height=h,
        alt_text=alt_text.strip() if alt_text else f"{title.strip()} — {category} at IYC Camp Meeting",
        is_visible=is_visible,
        sort_order=sort_order,
    )

    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@admin_router.patch("/{photo_id}", response_model=GalleryPhotoResponse, dependencies=[Depends(verify_csrf)])
def update_gallery_photo(
    photo_id: int,
    payload: GalleryPhotoUpdate,
    db: Session = Depends(get_db),
):
    """Update photo metadata, category/tag, title, caption, or toggle visibility."""
    photo = db.get(GalleryPhoto, photo_id)
    if not photo:
        raise AppError("Gallery photo not found", code="not_found", status_code=404)

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(photo, field, val)

    db.commit()
    db.refresh(photo)
    return photo


@admin_router.delete("/{photo_id}", dependencies=[Depends(verify_csrf)])
def delete_gallery_photo(
    photo_id: int,
    db: Session = Depends(get_db),
):
    """Permanently delete a gallery photo and remove its files from disk."""
    photo = db.get(GalleryPhoto, photo_id)
    if not photo:
        raise AppError("Gallery photo not found", code="not_found", status_code=404)

    # Clean up disk files
    for url in [photo.thumb_url, photo.full_url]:
        if url and url.startswith("/uploads/"):
            rel_path = url.replace("/uploads/", "", 1)
            full_disk_path = os.path.join(UPLOAD_DIR, rel_path)
            if os.path.exists(full_disk_path):
                try:
                    os.remove(full_disk_path)
                except OSError:
                    pass

    db.delete(photo)
    db.commit()
    return {"detail": "Photo deleted successfully", "id": photo_id, "success": True}

