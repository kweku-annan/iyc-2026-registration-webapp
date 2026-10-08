"""Tests for admin endpoints."""

import csv
import io
from datetime import date, UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_signed_session_token, generate_csrf_token
from app.main import app
from app.models import Base
from app.models.registration import Registration
from app.models.settings import Settings
from app.models.testimonial import Testimonial
from app.models.user import User

settings.cookie_domain = ""


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

    # Create test data
    s = Settings(
        id=1,
        registration_open=True,
        registration_closes_at=datetime.now(UTC) + timedelta(days=30),
        event_start=datetime.now(UTC) + timedelta(days=31),
        event_end=datetime.now(UTC) + timedelta(days=35),
        otp_enabled=True
    )

    org = User(email="org@test.com", password_hash="123", role="organizer")
    vol = User(email="vol@test.com", password_hash="123", role="volunteer")

    reg1 = Registration(
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1),
        age=30,
        profession="Engineer",
        student_status=False,
        location="Test City",
        accommodation_preference="Hotel",
        invitation_by_someone=False,
        phone_e164="+233241111111",
        church="Grace",
        attended_before=False,
        ticket_code="AAAA1111",
        ticket_token="token1"
    )
    reg2 = Registration(
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1),
        age=30,
        profession="Engineer",
        student_status=False,
        location="Test City",
        accommodation_preference="Hotel",
        invitation_by_someone=False,
        phone_e164="+233242222222",
        church="Hope",
        attended_before=True,
        ticket_code="BBBB2222",
        ticket_token="token2",
        source="walk_in",
        checked_in_at=datetime.now(UTC),
        checked_in_by=1
    )

    t1 = Testimonial(
        body="Great",
        privacy_mode="public",
        display_name="John",
        alias_name="Jack",
        consent=True,
        status="pending"
    )

    session.add_all([s, org, vol, reg1, reg2, t1])
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
    with TestClient(app, base_url="https://testserver") as c:
        yield c
    app.dependency_overrides.clear()


def get_auth_headers(db: Session, email: str) -> dict[str, str]:
    user = db.query(User).filter_by(email=email).first()
    csrf = generate_csrf_token()
    token = create_signed_session_token(user.id, user.role, csrf)
    return {"cookie": f"session_token={token}", "X-CSRF-Token": csrf}


def test_auth_enforced(client: TestClient):
    res = client.get("/admin/stats")
    assert res.status_code == 401


def test_role_enforced(client: TestClient, db: Session):
    headers = get_auth_headers(db, "vol@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])
    res = client.get("/admin/stats")
    assert res.status_code == 403


def test_get_stats(client: TestClient, db: Session):
    headers = get_auth_headers(db, "org@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])

    res = client.get("/admin/stats")
    assert res.status_code == 200
    data = res.json()
    assert data["total_registered"] == 2
    assert data["checked_in"] == 1
    assert data["walk_ins"] == 1
    assert data["pending_testimonials"] == 1


def test_get_registrations(client: TestClient, db: Session):
    headers = get_auth_headers(db, "org@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])

    res = client.get("/admin/registrations?search=Jane")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["full_name"] == "Jane Doe"


def test_export_csv(client: TestClient, db: Session):
    headers = get_auth_headers(db, "org@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])

    res = client.get("/admin/registrations/export.csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]

    content = res.content.decode("utf-8")
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)

    assert len(rows) == 3  # Header + 2 rows
    assert "Jane Doe" in rows[1] or "Jane Doe" in rows[2]


def test_update_settings(client: TestClient, db: Session):
    headers = get_auth_headers(db, "org@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])

    res = client.patch(
        "/admin/settings",
        json={"registration_open": False},
        headers={"X-CSRF-Token": headers["X-CSRF-Token"]}
    )
    assert res.status_code == 200

    s = db.get(Settings, 1)
    assert s.registration_open is False


def test_anonymize_registration(client: TestClient, db: Session):
    headers = get_auth_headers(db, "org@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])

    res = client.delete(
        "/admin/registrations/1",
        headers={"X-CSRF-Token": headers["X-CSRF-Token"]}
    )
    assert res.status_code == 200

    reg = db.get(Registration, 1)
    assert reg.full_name == "Anonymized User"
    assert reg.church == "Anonymized"
    assert "anon-" in reg.phone_e164

    # Verify second user wasn't touched
    reg2 = db.get(Registration, 2)
    assert reg2.full_name == "Jane Doe"
