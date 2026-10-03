"""Tests for authentication endpoints and dependencies."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password
from app.main import app
from app.models import Base
from app.models.user import User

# Fix cookie domain for TestClient
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

    # Create test users
    organizer = User(
        email="org@test.com",
        password_hash=hash_password("password123"),
        role="organizer",
        is_active=True
    )
    volunteer = User(
        email="vol@test.com",
        password_hash=hash_password("password123"),
        role="volunteer",
        is_active=True
    )
    inactive = User(
        email="inactive@test.com",
        password_hash=hash_password("password123"),
        role="volunteer",
        is_active=False
    )

    session.add_all([organizer, volunteer, inactive])
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


def test_login_success(client: TestClient):
    res = client.post("/auth/login", json={
        "email": "org@test.com",
        "password": "password123"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "org@test.com"
    assert data["role"] == "organizer"
    assert "csrf_token" in data

    # Check cookie
    assert "session_token" in res.cookies


def test_login_invalid_password(client: TestClient):
    res = client.post("/auth/login", json={
        "email": "org@test.com",
        "password": "wrongpassword"
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]


def test_login_inactive_user(client: TestClient):
    res = client.post("/auth/login", json={
        "email": "inactive@test.com",
        "password": "password123"
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]


def test_get_me_unauthenticated(client: TestClient):
    res = client.get("/auth/me")
    assert res.status_code == 401


def test_get_me_authenticated(client: TestClient):
    # Login first
    login_res = client.post("/auth/login", json={
        "email": "org@test.com",
        "password": "password123"
    })
    csrf_token = login_res.json()["csrf_token"]

    # Get me
    res = client.get("/auth/me")
    assert res.status_code == 200
    assert res.json()["email"] == "org@test.com"
    assert res.json()["csrf_token"] == csrf_token


def test_logout(client: TestClient):
    client.post("/auth/login", json={
        "email": "org@test.com",
        "password": "password123"
    })

    res = client.post("/auth/logout")
    assert res.status_code == 200

    # Get me should fail now
    res = client.get("/auth/me")
    assert res.status_code == 401
