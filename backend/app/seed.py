"""Seed script — run once after the first migration.

Creates:
  1. The settings row (id=1) with registration open until end of 26 Dec 2026 Africa/Accra.
  2. The first organizer user from environment variables.

Usage:
    cd backend
    python -m app.seed

Required env vars for the organizer account:
    SEED_ORGANIZER_EMAIL      login email
    SEED_ORGANIZER_PASSWORD   plain-text password (will be hashed before insert)
"""

from __future__ import annotations

import os
from datetime import UTC, datetime

from argon2 import PasswordHasher
from sqlalchemy.exc import IntegrityError

from app.core.database import SessionLocal
from app.models.settings import Settings
from app.models.user import User

# ── Event dates (Africa/Accra = UTC+0) ────────────────────────────────────────
# Registration closes at the very end of 26 Dec 2026.
REGISTRATION_CLOSES_AT = datetime(2026, 12, 26, 23, 59, 59, tzinfo=UTC)
EVENT_START = datetime(2026, 12, 23, 0, 0, 0, tzinfo=UTC)
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


def main() -> None:
    print("Running seed script…")
    db = SessionLocal()
    try:
        seed_settings(db)
        seed_organizer(db)
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
