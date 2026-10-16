"""Seed script — run once after the first migration.

Creates:
  1. The settings row (id=1) with registration open until end of 26 Dec 2026 Africa/Accra.
  2. The first organizer user from environment variables.
  3. The initial gallery exhibition photos from seed_data/gallery.json.

Usage:
    cd backend
    python -m app.seed

Required env vars for the organizer account:
    SEED_ORGANIZER_EMAIL      login email
    SEED_ORGANIZER_PASSWORD   plain-text password (will be hashed before insert)
"""

from __future__ import annotations

import json
import os
import shutil
from datetime import UTC, datetime

from argon2 import PasswordHasher
from sqlalchemy.exc import IntegrityError

from app.core.database import SessionLocal
from app.models.gallery import GalleryPhoto
from app.models.settings import Settings
from app.models.user import User

# ── Event dates (Africa/Accra = UTC+0) ────────────────────────────────────────
# Registration closes at the very end of 26 Dec 2026.
REGISTRATION_CLOSES_AT = datetime(2026, 12, 26, 18, 59, 59, tzinfo=UTC)
EVENT_START = datetime(2026, 12, 23, 12, 0, 0, tzinfo=UTC)
EVENT_END = datetime(2026, 12, 26, 23, 59, 59, tzinfo=UTC)


def seed_settings(db) -> None:
    existing = db.get(Settings, 1)
    if existing:
        print("  Settings row already exists — skipping.")
        return

    row = Settings(
        id=1,
        registration_open=True,
        registration_closes_at=REGISTRATION_CLOSES_AT,
        event_start=EVENT_START,
        event_end=EVENT_END,
        otp_enabled=True,
    )
    db.add(row)
    db.commit()
    print(f"  Created settings row (closes_at={REGISTRATION_CLOSES_AT.isoformat()}).")


def seed_organizer(db) -> None:
    email = os.environ.get("SEED_ORGANIZER_EMAIL", "").strip()
    password = os.environ.get("SEED_ORGANIZER_PASSWORD", "").strip()

    if not email or not password:
        print(
            "  SEED_ORGANIZER_EMAIL or SEED_ORGANIZER_PASSWORD not set — skipping organizer seed."
        )
        return

    if len(password) < 8:  # noqa: PLR2004
        print(
            "  ERROR: SEED_ORGANIZER_PASSWORD is too short (minimum 8 characters). "
            "Please set a strong password before seeding."
        )
        return

    existing = db.query(User).filter_by(email=email).first()
    if existing:
        print(f"  User {email!r} already exists — skipping.")
        return

    ph = PasswordHasher()
    user = User(
        email=email,
        password_hash=ph.hash(password),
        role="organizer",
        is_active=True,
    )
    try:
        db.add(user)
        db.commit()
        print(f"  Created organizer: {email!r}")
    except IntegrityError:
        db.rollback()
        print(f"  Conflict creating organizer {email!r} — skipping.")


def seed_gallery(db) -> None:
    # 1. Determine base directories and ensure upload folder exists
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    repo_dir = os.path.dirname(backend_dir)
    upload_dir = os.environ.get("UPLOAD_DIR", os.path.join(backend_dir, "uploads"))
    thumbs_dest = os.path.join(upload_dir, "gallery", "thumbs")
    full_dest = os.path.join(upload_dir, "gallery", "full")
    os.makedirs(thumbs_dest, exist_ok=True)
    os.makedirs(full_dest, exist_ok=True)

    # 2. Look for seed manifest in backend seed_data or frontend public gallery
    backend_seed = os.path.join(os.path.dirname(__file__), "seed_data", "gallery.json")
    repo_seed = os.path.join(repo_dir, "frontend", "public", "gallery", "gallery.json")
    manifest_path = backend_seed if os.path.exists(backend_seed) else repo_seed

    # 3. Synchronize WebP files from seed_data, frontend/public/gallery, or repo uploads into backend uploads if missing
    candidate_sources = [
        os.path.join(os.path.dirname(__file__), "seed_data", "gallery"),
        os.path.join(repo_dir, "frontend", "public", "gallery"),
        os.path.join(repo_dir, "uploads", "gallery"),
    ]
    for src_root in candidate_sources:
        if os.path.exists(src_root):
            for sub in ("thumbs", "full"):
                src_sub = os.path.join(src_root, sub)
                dst_sub = os.path.join(upload_dir, "gallery", sub)
                if os.path.exists(src_sub):
                    for fname in os.listdir(src_sub):
                        if fname.endswith(".webp"):
                            dst_file = os.path.join(dst_sub, fname)
                            if not os.path.exists(dst_file):
                                shutil.copy2(os.path.join(src_sub, fname), dst_file)

    # 4. Seed database records
    if not os.path.exists(manifest_path):
        print("  Gallery manifest not found — skipping gallery database seeding.")
        return

    with open(manifest_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = data.get("items", [])
    inserted = 0
    for idx, it in enumerate(items, start=1):
        slug = it.get("id")
        existing = db.query(GalleryPhoto).filter_by(slug=slug).first()
        if existing:
            continue

        thumb_url = it.get("thumb")
        full_url = it.get("full")
        if thumb_url and thumb_url.startswith("/gallery/"):
            thumb_url = thumb_url.replace("/gallery/", "/uploads/gallery/")
        if full_url and full_url.startswith("/gallery/"):
            full_url = full_url.replace("/gallery/", "/uploads/gallery/")

        photo = GalleryPhoto(
            slug=slug,
            title=it.get("title", f"Moment {idx}"),
            caption=it.get("caption", ""),
            category=it.get("category", "Worship & Praise"),
            year=it.get("year", 2025),
            thumb_url=thumb_url,
            full_url=full_url,
            width=it.get("width", 1200),
            height=it.get("height", 900),
            alt_text=it.get("alt", ""),
            is_visible=True,
            sort_order=idx,
        )
        db.add(photo)
        inserted += 1

    if inserted > 0:
        db.commit()
        print(f"  Created {inserted} new gallery photo record(s).")
    else:
        print(f"  Gallery photos already seeded ({db.query(GalleryPhoto).count()} photos).")


def main() -> None:
    print("Running seed script…")
    db = SessionLocal()
    try:
        seed_settings(db)
        seed_organizer(db)
        seed_gallery(db)
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
