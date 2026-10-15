"""Tests for registration endpoints."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app
from app.models import Base
from app.models.registration import Registration
from app.models.settings import Settings
from app.models.sms_log import SmsLog
import app.services.otp as otp_module


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

    # Create default settings (otp_enabled is kept in DB but disconnected from flow)
    settings = Settings(
        id=1,
        registration_open=True,
        registration_closes_at=datetime.now(UTC) + timedelta(days=30),
        event_start=datetime.now(UTC) + timedelta(days=31),
        event_end=datetime.now(UTC) + timedelta(days=35),
        otp_enabled=True
    )
    session.add(settings)
    session.commit()

    yield session
    session.close()
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture(autouse=True)
def reset_ip_tracker():
    """Clear the in-memory IP rate limiter between tests to prevent cross-test pollution."""
    otp_module._ip_tracker.clear()
    yield
    otp_module._ip_tracker.clear()


@pytest.fixture()
def client(db: Session) -> TestClient:
    def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _base_payload(**overrides) -> dict:
    """Return a valid registration payload without OTP token."""
    payload = {
        "first_name": "John",
        "last_name": "Doe",
        "date_of_birth": "1990-01-01",
        "profession": "Engineer",
        "student_status": False,
        "location": "Test City",
        "accommodation_preference": "Hotel",
        "invitation_by_someone": False,
        "phone": "0241234567",
        "church": "Grace Chapel",
        "attended_before": False,
        "website": "",
    }
    payload.update(overrides)
    return payload


def test_registration_status_open(client: TestClient):
    res = client.get("/registrations/status")
    assert res.status_code == 200
    assert res.json()["is_open"] is True


def test_registration_status_closed_by_flag(client: TestClient, db: Session):
    s = db.get(Settings, 1)
    s.registration_open = False
    db.commit()

    res = client.get("/registrations/status")
    assert res.json()["is_open"] is False


def test_registration_status_closed_by_date(client: TestClient, db: Session):
    s = db.get(Settings, 1)
    s.registration_closes_at = datetime.now(UTC) - timedelta(days=1)
    db.commit()

    res = client.get("/registrations/status")
    assert res.json()["is_open"] is False


def test_create_registration_success(client: TestClient, db: Session):
    """Registration succeeds without an OTP token (OTP flow is disconnected)."""
    res = client.post("/registrations", json=_base_payload())
    assert res.status_code == 200
    data = res.json()
    assert data["already_registered"] is False
    assert "detail" in data

    # Check DB record was created
    reg = db.query(Registration).filter_by(phone_e164="+233241234567").first()
    assert reg is not None
    assert reg.ticket_code is not None
    # phone_verified_at is None for online registrations now that OTP is disconnected
    assert reg.phone_verified_at is None

    # Check confirmation SMS was sent
    log = db.query(SmsLog).first()
    assert log is not None
    assert log.template == "registration_success"


def test_create_registration_with_optional_email(client: TestClient, db: Session):
    """Registration accepts an optional email address."""
    res = client.post("/registrations", json=_base_payload(email="john@example.com"))
    assert res.status_code == 200
    assert res.json()["already_registered"] is False

    reg = db.query(Registration).filter_by(phone_e164="+233241234567").first()
    assert reg is not None
    assert reg.email == "john@example.com"


def test_create_registration_without_email(client: TestClient, db: Session):
    """Registration succeeds when email is omitted."""
    res = client.post("/registrations", json=_base_payload())
    assert res.status_code == 200

    reg = db.query(Registration).filter_by(phone_e164="+233241234567").first()
    assert reg is not None
    assert reg.email is None


def test_create_registration_duplicate(client: TestClient, db: Session):
    """Submitting the same phone number twice returns already_registered=True."""
    # First registration
    client.post("/registrations", json=_base_payload())

    # Clear SMS log to isolate the duplicate signal
    db.query(SmsLog).delete()
    db.commit()

    # Duplicate registration with same phone
    res = client.post("/registrations", json=_base_payload())
    assert res.status_code == 200
    data = res.json()
    assert data["already_registered"] is True
    assert "already registered" in data["detail"].lower()

    # Should only be one record
    regs = db.query(Registration).all()
    assert len(regs) == 1

    # Ticket SMS should be resent
    log = db.query(SmsLog).first()
    assert log is not None
    assert log.template == "registration_duplicate"


def test_create_registration_honeypot(client: TestClient):
    """Honeypot field filled → rejected as bot."""
    res = client.post("/registrations", json=_base_payload(website="http://spam.com"))
    assert res.status_code == 400


def test_create_registration_no_otp_required(client: TestClient):
    """Registration no longer requires an OTP token — succeeds without one."""
    # OTP flow is disconnected; submitting without otp_token must succeed
    res = client.post("/registrations", json=_base_payload())
    assert res.status_code == 200
    assert res.json()["already_registered"] is False


def test_get_ticket(client: TestClient, db: Session):
    """Ticket page returns data for a valid ticket token."""
    # Use a unique phone to avoid any state from previous tests
    res = client.post("/registrations", json=_base_payload(phone="0244000001"))
    assert res.status_code == 200

    reg = db.query(Registration).filter_by(phone_e164="+233244000001").first()
    assert reg is not None
    ticket_token = reg.ticket_token

    res = client.get(f"/tickets/{ticket_token}")
    assert res.status_code == 200
    data = res.json()
    assert data["first_name"] == "John"
    assert data["last_name"] == "Doe"
    assert "ticket_code" in data
