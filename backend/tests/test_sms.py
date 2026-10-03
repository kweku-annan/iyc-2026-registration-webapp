"""Tests for app/services/sms.py."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.models import Base
from app.models.sms_log import SmsLog
from app.services.sms import (
    ConsoleSmsProvider,
    MnotifySmsProvider,
    get_sms_provider,
    send_sms,
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

def test_get_sms_provider_console_default():
    # By default in test/dev env, sms_provider is "console"
    provider = get_sms_provider()
    assert isinstance(provider, ConsoleSmsProvider)


def test_get_sms_provider_mnotify(monkeypatch):
    monkeypatch.setattr(settings, "sms_provider", "mnotify")
    provider = get_sms_provider()
    assert isinstance(provider, MnotifySmsProvider)


def test_console_provider_sends_successfully(capsys):
    provider = ConsoleSmsProvider()
    result = provider.send("+233241234567", "Your OTP is 1234")

    assert result.status == "sent"
    assert "console" in result.provider_response

    # Verify it prints to stdout
    captured = capsys.readouterr()
    assert "Your OTP is 1234" in captured.out
    assert "+233241234567" in captured.out


def test_send_sms_writes_log_to_db(db: Session):
    # Sends via console provider and logs to DB
    result = send_sms(
        db=db,
        to_phone="+233241234567",
        template="test_template",
        message="Test message",
    )

    assert result.status == "sent"

    # Verify DB log
    log_entry = db.query(SmsLog).first()
    assert log_entry is not None
    assert log_entry.to_phone == "+233241234567"
    assert log_entry.template == "test_template"
    assert log_entry.status == "sent"
    assert log_entry.registration_id is None
    assert log_entry.provider_response == result.provider_response


def test_send_sms_handles_provider_exception(db: Session, monkeypatch):
    # Make the provider raise an exception
    def mock_send(*args, **kwargs):
        raise ValueError("Simulated provider failure")

    monkeypatch.setattr("app.services.sms.ConsoleSmsProvider.send", mock_send)

    result = send_sms(
        db=db,
        to_phone="+233241234567",
        template="crash_test",
        message="Should fail",
    )

    assert result.status == "failed"
    assert "Simulated provider failure" in result.provider_response

    # Ensure it's still logged to DB
    log_entry = db.query(SmsLog).first()
    assert log_entry is not None
    assert log_entry.status == "failed"
    assert "EXCEPTION: Simulated provider failure" in log_entry.provider_response
