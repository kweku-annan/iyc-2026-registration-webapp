"""Tests for database models and unique constraints.

Uses SQLite in-memory — no PostgreSQL required to run the test suite.
Every test that exercises a unique constraint uses a fresh database so
tests are fully isolated.
"""

from __future__ import annotations

from datetime import date, UTC, datetime

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.models import Base, OtpCode, Registration, Settings, User

# ── Fixtures ──────────────────────────────────────────────────────────────────

def make_engine():
    """Create an in-memory SQLite engine with FK enforcement enabled."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    # SQLite does not enforce FK constraints by default.
    @event.listens_for(engine, "connect")
    def enable_fk(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")
    return engine


@pytest.fixture()
def db() -> Session:
    """Yield a fresh in-memory SQLite session for each test."""
    engine = make_engine()
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = SessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(engine)
    engine.dispose()


# ── Helper factories ──────────────────────────────────────────────────────────

NOW = datetime(2026, 10, 1, 12, 0, 0, tzinfo=UTC)
CLOSE_DATE = datetime(2026, 12, 26, 23, 59, 59, tzinfo=UTC)


def make_registration(
    phone: str = "+233241234567",
    ticket_code: str = "ABCD1234",
    ticket_token: str = "tok_aaaaaaaaaaaaaaaa",
    **kwargs,
) -> Registration:
    return Registration(
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1),
        age=30,
        profession="Engineer",
        student_status=False,
        location="Test City",
        accommodation_preference="Hotel",
        invitation_by_someone=False,
        phone_e164=phone,
        church="Grace Chapel",
        attended_before=False,
        ticket_code=ticket_code,
        ticket_token=ticket_token,
        source="online",
        **kwargs,
    )


def make_user(email: str = "admin@iyc.org", role: str = "organizer") -> User:
    return User(email=email, password_hash="hashed", role=role)


def make_settings() -> Settings:
    return Settings(
        id=1,
        registration_open=True,
        registration_closes_at=CLOSE_DATE,
        event_start=datetime(2026, 12, 23, 0, 0, 0, tzinfo=UTC),
        event_end=CLOSE_DATE,
        otp_enabled=True,
    )


# ── Settings tests ────────────────────────────────────────────────────────────

def test_settings_row_is_created(db: Session) -> None:
    db.add(make_settings())
    db.commit()
    row = db.get(Settings, 1)
    assert row is not None
    assert row.registration_open is True
    # SQLite strips tzinfo from DateTime(timezone=True) on read-back.
    # In production (PostgreSQL) the value round-trips with timezone intact.
    # We compare naive datetimes here; the values are otherwise identical.
    assert row.registration_closes_at.replace(tzinfo=None) == CLOSE_DATE.replace(tzinfo=None)


def test_settings_single_row_constraint(db: Session) -> None:
    """Only id=1 may be inserted (CHECK id = 1)."""
    db.add(make_settings())
    db.commit()
    # Attempt to insert a second row — should fail.
    db.add(Settings(
        id=2,
        registration_open=False,
        registration_closes_at=CLOSE_DATE,
        event_start=CLOSE_DATE,
        event_end=CLOSE_DATE,
        otp_enabled=True,
    ))
    with pytest.raises(IntegrityError):
        db.commit()


# ── Registration unique constraint tests ──────────────────────────────────────

def test_registration_created_successfully(db: Session) -> None:
    db.add(make_registration())
    db.commit()
    r = db.query(Registration).first()
    assert r is not None
    assert r.phone_e164 == "+233241234567"
    assert r.ticket_code == "ABCD1234"


def test_duplicate_phone_e164_rejected(db: Session) -> None:
    """Two registrations with the same phone (unique constraint on phone_e164)."""
    db.add(make_registration(phone="+233241234567", ticket_code="AAAA1111", ticket_token="tok_111"))
    db.commit()

    db.add(make_registration(phone="+233241234567", ticket_code="BBBB2222", ticket_token="tok_222"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_duplicate_ticket_code_rejected(db: Session) -> None:
    """Two registrations with the same ticket_code."""
    db.add(make_registration(phone="+233241111111", ticket_code="SAME1234", ticket_token="tok_aaa"))
    db.commit()

    db.add(make_registration(phone="+233242222222", ticket_code="SAME1234", ticket_token="tok_bbb"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_duplicate_ticket_token_rejected(db: Session) -> None:
    """Two registrations with the same ticket_token."""
    db.add(make_registration(phone="+233241111111", ticket_code="CODE1111", ticket_token="tok_same"))
    db.commit()

    db.add(make_registration(phone="+233242222222", ticket_code="CODE2222", ticket_token="tok_same"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_different_phone_formats_blocked(db: Session) -> None:
    """Ensure that the duplicate-phone logic also works when the service
    has already normalized '024...' → '+23324...' before insert.

    The DB constraint enforces uniqueness on the normalized E.164 string.
    This test verifies that two inserts with the same normalized value are
    rejected — the phone normalization itself is tested in test_phones.py (T2).
    """
    normalized = "+233241234567"
    db.add(make_registration(phone=normalized, ticket_code="AAA11111", ticket_token="tok_x1"))
    db.commit()

    db.add(make_registration(phone=normalized, ticket_code="BBB22222", ticket_token="tok_x2"))
    with pytest.raises(IntegrityError):
        db.commit()


# ── OTP code tests ────────────────────────────────────────────────────────────

def test_otp_code_created(db: Session) -> None:
    otp = OtpCode(
        phone_e164="+233241234567",
        code_hash="hashvalue",
        expires_at=datetime(2026, 10, 1, 13, 0, 0, tzinfo=UTC),
        attempts=0,
    )
    db.add(otp)
    db.commit()
    row = db.get(OtpCode, "+233241234567")
    assert row is not None
    assert row.attempts == 0


def test_otp_upsert_replaces_previous(db: Session) -> None:
    """phone_e164 is the PK so inserting twice should raise; service uses merge/upsert."""
    otp1 = OtpCode(
        phone_e164="+233241234567",
        code_hash="hash1",
        expires_at=datetime(2026, 10, 1, 13, 0, 0, tzinfo=UTC),
    )
    db.add(otp1)
    db.commit()

    # Simulate a resend: delete old, insert new (the service will do this).
    db.delete(db.get(OtpCode, "+233241234567"))
    otp2 = OtpCode(
        phone_e164="+233241234567",
        code_hash="hash2",
        expires_at=datetime(2026, 10, 1, 14, 0, 0, tzinfo=UTC),
    )
    db.add(otp2)
    db.commit()
    row = db.get(OtpCode, "+233241234567")
    assert row.code_hash == "hash2"


# ── User unique constraint tests ──────────────────────────────────────────────

def test_duplicate_user_email_rejected(db: Session) -> None:
    db.add(make_user(email="dup@iyc.org"))
    db.commit()

    db.add(make_user(email="dup@iyc.org"))
    with pytest.raises(IntegrityError):
        db.commit()


# ── Checked-in-by FK tests ────────────────────────────────────────────────────

def test_checked_in_by_references_user(db: Session) -> None:
    user = make_user()
    db.add(user)
    db.commit()

    reg = make_registration()
    reg.checked_in_by = user.id
    reg.checked_in_at = NOW
    db.add(reg)
    db.commit()

    fetched = db.query(Registration).first()
    assert fetched.checked_in_by == user.id
