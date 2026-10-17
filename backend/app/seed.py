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
from dotenv import load_dotenv
from sqlalchemy.exc import IntegrityError

load_dotenv()

from app.core.database import SessionLocal
from app.models.gallery import GalleryPhoto
from app.models.partner import Partner
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
    upload_dir = os.environ.get("UPLOAD_DIR", os.path.join(backend_dir, "uploads"))
    thumbs_dest = os.path.join(upload_dir, "gallery", "thumbs")
    full_dest = os.path.join(upload_dir, "gallery", "full")
    os.makedirs(thumbs_dest, exist_ok=True)
    os.makedirs(full_dest, exist_ok=True)

    # 2. Seed manifest from backend seed_data
    manifest_path = os.path.join(os.path.dirname(__file__), "seed_data", "gallery.json")

    # 3. Synchronize WebP files from backend seed_data/gallery into runtime uploads if missing
    seed_gallery_dir = os.path.join(os.path.dirname(__file__), "seed_data", "gallery")
    if os.path.exists(seed_gallery_dir):
        for sub in ("thumbs", "full"):
            src_sub = os.path.join(seed_gallery_dir, sub)
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


def seed_partners(db) -> None:
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    upload_dir = os.environ.get("UPLOAD_DIR", os.path.join(backend_dir, "uploads"))
    os.makedirs(upload_dir, exist_ok=True)

    # 1. Synchronize partner logos from seed_data into runtime uploads if missing
    seed_partners_dir = os.path.join(os.path.dirname(__file__), "seed_data", "partners")
    if os.path.exists(seed_partners_dir):
        for fname in os.listdir(seed_partners_dir):
            src_file = os.path.join(seed_partners_dir, fname)
            dst_file = os.path.join(upload_dir, fname)
            if not os.path.exists(dst_file):
                shutil.copy2(src_file, dst_file)

    # 2. Seed partners table if empty
    partners_manifest = os.path.join(os.path.dirname(__file__), "seed_data", "partners.json")
    if not os.path.exists(partners_manifest):
        return

    with open(partners_manifest, "r", encoding="utf-8") as f:
        partners_data = json.load(f)

    inserted = 0
    for p_data in partners_data:
        existing = db.query(Partner).filter_by(name=p_data["name"]).first()
        if not existing:
            partner = Partner(
                name=p_data["name"],
                logo_url=p_data["logo_url"],
                website_url=p_data.get("website_url"),
                location=p_data.get("location"),
                sort_order=p_data.get("sort_order", 0),
                is_active=p_data.get("is_active", True),
            )
            db.add(partner)
            inserted += 1

    if inserted > 0:
        db.commit()
        print(f"  Created {inserted} partner church record(s).")
    else:
        print(f"  Partners already seeded ({db.query(Partner).count()} partners).")


def main() -> None:
    print("Running seed script…")
    db = SessionLocal()
    try:
        seed_settings(db)
        seed_organizer(db)
        seed_gallery(db)
        seed_partners(db)
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
