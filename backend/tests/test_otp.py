"""Tests for OTP endpoints and logic."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app
from app.models import Base
from app.models.otp_code import OtpCode
from app.models.sms_log import SmsLog
from app.services.otp import _ip_tracker, ph

# ── Fixtures ──────────────────────────────────────────────────────────────────

def make_engine():
    return create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


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


@pytest.fixture()
def client(db: Session) -> TestClient:
    def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    # Clear IP tracker before each test
    _ip_tracker.clear()
    yield TestClient(app)
    app.dependency_overrides.clear()


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_send_otp_success(client: TestClient, db: Session):
    response = client.post("/registrations/otp/send", json={"phone": "0241234567"})
    assert response.status_code == 200

    # Verify DB state
    otp = db.get(OtpCode, "+233241234567")
    assert otp is not None
    assert otp.attempts == 0

    # SMS Log should exist
    log = db.query(SmsLog).first()
    assert log is not None
    assert log.to_phone == "+233241234567"
    assert log.template == "otp"


def test_send_otp_cooldown(client: TestClient):
    # First send works
    assert client.post("/registrations/otp/send", json={"phone": "0241234567"}).status_code == 200

    # Immediate second send hits cooldown
    res = client.post("/registrations/otp/send", json={"phone": "0241234567"})
    assert res.status_code == 429
    assert res.json()["code"] == "rate_limited"
    assert "1 minute" in res.json()["detail"]


def test_verify_otp_success(client: TestClient, db: Session):
    # We must insert a known OTP to test verification
    # 123456 hashed
    db.add(OtpCode(
        phone_e164="+233241234567",
        code_hash=ph.hash("123456"),
        expires_at=datetime.now(UTC) + timedelta(minutes=10),
        attempts=0
    ))
    db.commit()

    res = client.post("/registrations/otp/verify", json={"phone": "0241234567", "code": "123456"})
    assert res.status_code == 200

    # Record should be deleted on success
    assert db.get(OtpCode, "+233241234567") is None


def test_verify_otp_invalid(client: TestClient, db: Session):
    db.add(OtpCode(
        phone_e164="+233241234567",
        code_hash=ph.hash("123456"),
        expires_at=datetime.now(UTC) + timedelta(minutes=10),
        attempts=0
    ))
    db.commit()

    res = client.post("/registrations/otp/verify", json={"phone": "0241234567", "code": "999999"})
    assert res.status_code == 400
    assert res.json()["code"] == "otp_invalid"

    otp = db.get(OtpCode, "+233241234567")
    assert otp.attempts == 1


def test_verify_otp_max_attempts(client: TestClient, db: Session):
    # Pre-seed with 2 attempts (next failure will be 3rd)
    db.add(OtpCode(
        phone_e164="+233241234567",
        code_hash=ph.hash("123456"),
        expires_at=datetime.now(UTC) + timedelta(minutes=10),
        attempts=2
    ))
    db.commit()

    # 3rd failure increments to 3, but the logic in `verify_otp` throws invalid on 3rd fail.
    # Wait, if attempts >= 3 BEFORE check, it raises 403.
    # Since it was 2, it fails verify, increments to 3.
    res = client.post("/registrations/otp/verify", json={"phone": "0241234567", "code": "999999"})
    assert res.status_code == 400

    # Next attempt (even if correct or wrong) will hit max attempts 403
    res = client.post("/registrations/otp/verify", json={"phone": "0241234567", "code": "123456"})
    assert res.status_code == 403
    assert res.json()["code"] == "otp_max_attempts"


def test_verify_otp_expired(client: TestClient, db: Session):
    db.add(OtpCode(
        phone_e164="+233241234567",
        code_hash=ph.hash("123456"),
        expires_at=datetime.now(UTC) - timedelta(minutes=1),
        attempts=0
    ))
    db.commit()

    res = client.post("/registrations/otp/verify", json={"phone": "0241234567", "code": "123456"})
    assert res.status_code == 400
    assert res.json()["code"] == "otp_expired"
    # Should be deleted
    assert db.get(OtpCode, "+233241234567") is None


def test_daily_phone_limit(client: TestClient, db: Session):
    phone = "+233249999999"
    # Seed 3 SMS logs today
    for _ in range(3):
        db.add(SmsLog(
            to_phone=phone,
            template="otp",
            status="sent",
            created_at=datetime.now(UTC)
        ))
    db.commit()

    res = client.post("/registrations/otp/send", json={"phone": "0249999999"})
    assert res.status_code == 429
    assert res.json()["code"] == "rate_limited"
    assert "Daily SMS limit" in res.json()["detail"]


def test_ip_rate_limit(client: TestClient):
    # Send 5 times to different phones (to avoid phone cooldown)
    for i in range(5):
        res = client.post("/registrations/otp/send", json={"phone": f"024111111{i}"})
        assert res.status_code == 200

    # 6th time should hit IP rate limit
    res = client.post("/registrations/otp/send", json={"phone": "0242222222"})
    assert res.status_code == 429
    assert res.json()["code"] == "rate_limited"
    assert "IP" in res.json()["detail"]
