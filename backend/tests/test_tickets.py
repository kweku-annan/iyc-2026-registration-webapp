"""Tests for app/services/tickets.py — ticket code generation and normalization."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.exceptions import TicketValidationError
from app.models import Base
from app.models.registration import Registration
from app.services.tickets import (
    UNAMBIGUOUS_CHARS,
    format_ticket_code,
    generate_ticket_code,
    generate_ticket_token,
    generate_unique_ticket_code,
    normalize_ticket_code,
)

# ── Fixtures ──────────────────────────────────────────────────────────────────

def make_engine():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    @event.listens_for(engine, "connect")
    def enable_fk(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")
    return engine


@pytest.fixture()
def db() -> Session:
    engine = make_engine()
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = SessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(engine)
    engine.dispose()


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_generate_ticket_code_length_and_chars():
    code = generate_ticket_code()
    assert len(code) == 8
    # Must only contain unambiguous characters
    assert all(c in UNAMBIGUOUS_CHARS for c in code)


def test_generate_ticket_token():
    token = generate_ticket_token()
    # 16 bytes urlsafe base64 is 22 chars minimum
    assert len(token) >= 22
    assert "-" in token or "_" in token or token.isalnum()


def test_format_ticket_code():
    assert format_ticket_code("A3K9M2P4") == "A3K9-M2P4"


def test_format_ticket_code_invalid_length():
    with pytest.raises(TicketValidationError):
        format_ticket_code("A3K9M2P")


def test_normalize_ticket_code_success():
    assert normalize_ticket_code("a3k9-m2p4") == "A3K9M2P4"
    assert normalize_ticket_code(" A3K9 m2P4 ") == "A3K9M2P4"
    assert normalize_ticket_code("A3K9M2P4") == "A3K9M2P4"


def test_normalize_ticket_code_invalid_length():
    with pytest.raises(TicketValidationError, match="exactly 8"):
        normalize_ticket_code("A3K9-M2P")


def test_normalize_ticket_code_invalid_chars():
    # 'O' is ambiguous and not allowed
    with pytest.raises(TicketValidationError, match="invalid characters"):
        normalize_ticket_code("A3K9-M2PO")


def test_generate_unique_ticket_code_first_try(db: Session):
    code = generate_unique_ticket_code(db)
    assert len(code) == 8


def test_generate_unique_ticket_code_collision_retry(db: Session, monkeypatch):
    # Mock generate_ticket_code to return a known sequence:
    # 1st: "AAAA1111" (already in DB)
    # 2nd: "BBBB2222" (free)

    # Pre-seed DB
    reg = Registration(
        full_name="Test",
        phone_e164="+233241234567",
        church="Test Church",
        attended_before=False,
        ticket_code="AAAA1111",
        ticket_token="tok1",
        source="online",
    )
    db.add(reg)
    db.commit()

    codes = ["BBBB2222", "AAAA1111"]

    def mock_generate():
        return codes.pop()

    monkeypatch.setattr("app.services.tickets.generate_ticket_code", mock_generate)

    unique_code = generate_unique_ticket_code(db)
    assert unique_code == "BBBB2222"


def test_generate_unique_ticket_code_exhausts_retries(db: Session, monkeypatch):
    # Pre-seed DB
    reg = Registration(
        full_name="Test",
        phone_e164="+233241234567",
        church="Test Church",
        attended_before=False,
        ticket_code="AAAA1111",
        ticket_token="tok1",
        source="online",
    )
    db.add(reg)
    db.commit()

    # Always return the one that is in DB
    monkeypatch.setattr("app.services.tickets.generate_ticket_code", lambda: "AAAA1111")

    with pytest.raises(RuntimeError, match="Failed to generate a unique ticket code"):
        generate_unique_ticket_code(db, max_retries=3)
