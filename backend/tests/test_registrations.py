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
from app.services.otp import generate_otp_token


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

    # Create default settings
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


@pytest.fixture()
def client(db: Session) -> TestClient:
    def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


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
    # Set to past
    s.registration_closes_at = datetime.now(UTC) - timedelta(days=1)
    db.commit()

    res = client.get("/registrations/status")
    assert res.json()["is_open"] is False


def test_create_registration_success(client: TestClient, db: Session):
    # Need a valid token
    token = generate_otp_token("+233241234567")

    payload = {
        "full_name": "John Doe",
        "phone": "0241234567",
        "church": "Grace Chapel",
        "attended_before": False,
        "website": "",
        "otp_token": token
    }

    res = client.post("/registrations", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "ticket_token" in data

    # Check DB
    reg = db.query(Registration).filter_by(phone_e164="+233241234567").first()
    assert reg is not None
    assert reg.ticket_code is not None

    # Check SMS Log
    log = db.query(SmsLog).first()
    assert log is not None
    assert log.template == "registration_success"


def test_create_registration_duplicate(client: TestClient, db: Session):
    # First registration
    token = generate_otp_token("+233241234567")
    client.post("/registrations", json={
        "full_name": "John Doe",
        "phone": "0241234567",
        "church": "Grace",
        "attended_before": False,
        "website": "",
        "otp_token": token
    })

    db.query(SmsLog).delete()
    db.commit()

    # Duplicate registration
    res = client.post("/registrations", json={
        "full_name": "John Doe 2",
        "phone": "0241234567",
        "church": "Grace",
        "attended_before": False,
        "website": "",
        "otp_token": token
    })
    assert res.status_code == 200
    assert "already registered" in res.json()["detail"]

    # Should only be one record
    regs = db.query(Registration).all()
    assert len(regs) == 1
    assert regs[0].full_name == "John Doe"  # Name didn't change

    # SMS should be resent
    log = db.query(SmsLog).first()
    assert log is not None
    assert log.template == "registration_duplicate"


def test_create_registration_honeypot(client: TestClient):
    payload = {
        "full_name": "Bot",
        "phone": "0241234567",
        "church": "Bot",
        "attended_before": False,
        "website": "http://spam.com",
        "otp_token": "token"
    }
    res = client.post("/registrations", json=payload)
    assert res.status_code == 400


def test_create_registration_otp_required(client: TestClient):
    payload = {
        "full_name": "John",
        "phone": "0241234567",
        "church": "Church",
        "attended_before": False,
        "website": ""
    }
    res = client.post("/registrations", json=payload)
    assert res.status_code == 400
    assert res.json()["code"] == "otp_required"


def test_get_ticket(client: TestClient, db: Session):
    token = generate_otp_token("+233241234567")
    res = client.post("/registrations", json={
        "full_name": "Jane Doe",
        "phone": "0241234567",
        "church": "Grace",
        "attended_before": False,
        "website": "",
        "otp_token": token
    })
    ticket_token = res.json()["ticket_token"]

    res = client.get(f"/tickets/{ticket_token}")
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Jane Doe"
    assert "ticket_code" in data
