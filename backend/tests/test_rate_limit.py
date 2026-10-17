"""Tests for IP rate limiting, proxy resolution, duplicate phone cooldown, and Turnstile."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import Request
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import (
    SlidingWindowRateLimiter,
    get_client_ip,
    ip_rate_limiter,
    verify_turnstile,
)
from app.main import app
from app.models import Base
from app.models.settings import Settings
from app.models.sms_log import SmsLog


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

    s = Settings(
        id=1,
        registration_open=True,
        registration_closes_at=datetime.now(UTC) + timedelta(days=30),
        event_start=datetime.now(UTC) + timedelta(days=31),
        event_end=datetime.now(UTC) + timedelta(days=35),
        otp_enabled=True,
    )
    session.add(s)
    session.commit()

    yield session
    session.close()
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture(autouse=True)
def reset_limiter():
    ip_rate_limiter.clear()
    yield
    ip_rate_limiter.clear()


@pytest.fixture()
def client(db: Session) -> TestClient:
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _valid_payload(**overrides) -> dict:
    payload = {
        "first_name": "Test",
        "last_name": "User",
        "date_of_birth": "1995-05-15",
        "profession": "Software Engineer",
        "student_status": False,
        "location": "Accra",
        "accommodation_preference": "Hotel",
        "invitation_by_someone": False,
        "phone": "0241000001",
        "church": "Central Church",
        "attended_before": False,
        "website": "",
    }
    payload.update(overrides)
    return payload


# ── Client IP extraction tests ────────────────────────────────────────────────


def test_get_client_ip_cf_connecting_ip():
    """Cloudflare CF-Connecting-IP takes precedence."""
    req = MagicMock(spec=Request)
    req.headers = {
        "cf-connecting-ip": "203.0.113.195",
        "x-forwarded-for": "198.51.100.1, 10.0.0.1",
        "x-real-ip": "198.51.100.1",
    }
    assert get_client_ip(req) == "203.0.113.195"


def test_get_client_ip_x_forwarded_for_first():
    """X-Forwarded-For extracts the first public client IP."""
    req = MagicMock(spec=Request)
    req.headers = {
        "x-forwarded-for": "198.51.100.42, 10.0.0.1, 172.16.0.1",
    }
    assert get_client_ip(req) == "198.51.100.42"


def test_get_client_ip_x_real_ip():
    """X-Real-IP is used when X-Forwarded-For and CF-Connecting-IP are absent."""
    req = MagicMock(spec=Request)
    req.headers = {"x-real-ip": "192.0.2.1"}
    assert get_client_ip(req) == "192.0.2.1"


def test_get_client_ip_fallback():
    """Falls back to direct connection client.host."""
    req = MagicMock(spec=Request)
    req.headers = {}
    client_mock = MagicMock()
    client_mock.host = "127.0.0.1"
    req.client = client_mock
    assert get_client_ip(req) == "127.0.0.1"


# ── Sliding Window Unit Tests ──────────────────────────────────────────────────


def test_sliding_window_burst_limit():
    limiter = SlidingWindowRateLimiter(window_seconds=60, max_requests=3)
    now = 1000.0

    # 3 allowed
    for _ in range(3):
        limited, retry_after, _ = limiter.is_rate_limited("10.0.0.1", now=now)
        assert not limited
        assert retry_after == 0

    # 4th blocked
    limited, retry_after, detail = limiter.is_rate_limited("10.0.0.1", now=now)
    assert limited
    assert retry_after == 60
    assert "Too many requests" in detail

    # Different IP is not blocked
    limited, _, _ = limiter.is_rate_limited("10.0.0.2", now=now)
    assert not limited

    # After window passes, request is allowed again
    limited, _, _ = limiter.is_rate_limited("10.0.0.1", now=now + 61.0)
    assert not limited


def test_sliding_window_daily_limit():
    limiter = SlidingWindowRateLimiter(
        window_seconds=10, max_requests=100, daily_window_seconds=1000, daily_max_requests=2
    )
    now = 5000.0

    # 2 allowed
    assert not limiter.is_rate_limited("1.2.3.4", now=now)[0]
    assert not limiter.is_rate_limited("1.2.3.4", now=now + 1)[0]

    # 3rd hits daily limit
    limited, retry_after, detail = limiter.is_rate_limited("1.2.3.4", now=now + 2)
    assert limited
    assert "Daily limit reached" in detail
    assert retry_after > 0


# ── End-to-end Rate Limit on Registration ─────────────────────────────────────


def test_registration_ip_rate_limiting(client: TestClient):
    """After 5 registrations from the same IP, the 6th gets 429 Too Many Requests."""
    headers = {"X-Forwarded-For": "203.0.113.50"}

    for i in range(5):
        res = client.post(
            "/registrations",
            json=_valid_payload(phone=f"02410000{i:02d}"),
            headers=headers,
        )
        assert res.status_code == 200, res.text

    # 6th request from same IP is blocked with 429 and Retry-After header
    res = client.post(
        "/registrations",
        json=_valid_payload(phone="0241000099"),
        headers=headers,
    )
    assert res.status_code == 429
    assert res.json()["code"] == "rate_limited"
    assert "Retry-After" in res.headers

    # Another IP can still register without being blocked
    other_ip_headers = {"X-Forwarded-For": "203.0.113.51"}
    res2 = client.post(
        "/registrations",
        json=_valid_payload(phone="0241000099"),
        headers=other_ip_headers,
    )
    assert res2.status_code == 200


# ── Duplicate Phone SMS Cooldown Test ─────────────────────────────────────────


def test_duplicate_phone_sms_cooldown(client: TestClient, db: Session):
    """Submitting duplicate registration within 5 minutes only sends 1 SMS."""
    # First submission
    res1 = client.post("/registrations", json=_valid_payload(phone="0241239999"))
    assert res1.status_code == 200
    assert db.query(SmsLog).count() == 1

    # Second submission immediately with same phone (different IP to avoid IP rate limit)
    res2 = client.post(
        "/registrations",
        json=_valid_payload(phone="0241239999"),
        headers={"X-Forwarded-For": "10.1.1.2"},
    )
    assert res2.status_code == 200
    assert res2.json()["already_registered"] is True

    # No additional SMS was sent because 5-minute cooldown is active!
    assert db.query(SmsLog).count() == 1


# ── Turnstile Verification Tests ──────────────────────────────────────────────


def test_turnstile_bypassed_when_disabled():
    """When TURNSTILE_ENABLED is False, verification always succeeds."""
    with patch.object(settings, "turnstile_enabled", False):
        assert verify_turnstile(None) is True
        assert verify_turnstile("") is True
        assert verify_turnstile("dummy") is True


def test_turnstile_fails_when_enabled_and_missing():
    """When TURNSTILE_ENABLED is True, missing token returns False."""
    with patch.object(settings, "turnstile_enabled", True), patch.object(
        settings, "turnstile_secret_key", "secret-key"
    ):
        assert verify_turnstile(None) is False
        assert verify_turnstile("") is False


def test_turnstile_api_verification():
    """When TURNSTILE_ENABLED is True, queries Cloudflare siteverify endpoint."""
    with (
        patch.object(settings, "turnstile_enabled", True),
        patch.object(settings, "turnstile_secret_key", "secret-key"),
        patch("app.core.rate_limit.requests.post") as mock_post,
    ):
        mock_post.return_value.json.return_value = {"success": True}
        mock_post.return_value.status_code = 200

        assert verify_turnstile("test-token", client_ip="1.2.3.4") is True
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert "siteverify" in args[0]
        assert kwargs["data"]["response"] == "test-token"
        assert kwargs["data"]["remoteip"] == "1.2.3.4"


def test_turnstile_token_too_long():
    """Token longer than 2048 chars is rejected immediately."""
    with patch.object(settings, "turnstile_enabled", True), patch.object(
        settings, "turnstile_secret_key", "secret-key"
    ):
        long_token = "a" * 2049
        assert verify_turnstile(long_token) is False


def test_turnstile_action_and_hostname_checks():
    """Verifies that action and hostname matching is enforced when returned."""
    with (
        patch.object(settings, "turnstile_enabled", True),
        patch.object(settings, "turnstile_secret_key", "secret-key"),
        patch.object(settings, "turnstile_hostnames", "example.com, localhost"),
        patch("app.core.rate_limit.requests.post") as mock_post,
    ):
        # 1. Matching action and hostname
        mock_post.return_value.json.return_value = {
            "success": True,
            "action": "registration",
            "hostname": "example.com",
        }
        mock_post.return_value.status_code = 200
        assert verify_turnstile("token", expected_action="registration") is True

        # 2. Action mismatch
        mock_post.return_value.json.return_value = {
            "success": True,
            "action": "login",
            "hostname": "example.com",
        }
        assert verify_turnstile("token", expected_action="registration") is False

        # 3. Hostname mismatch
        mock_post.return_value.json.return_value = {
            "success": True,
            "action": "registration",
            "hostname": "malicious.com",
        }
        assert verify_turnstile("token", expected_action="registration") is False


def test_registration_accepts_cf_turnstile_response_alias(client: TestClient):
    """Payload accepting cf-turnstile-response alias deserializes properly."""
    res = client.post(
        "/registrations",
        json=_valid_payload(phone="0241888888", **{"cf-turnstile-response": "valid-token"}),
    )
    assert res.status_code == 200

