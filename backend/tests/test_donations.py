import pytest
from unittest.mock import patch, AsyncMock
import hmac
import hashlib
from datetime import UTC, datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.config import settings
from app.main import app
from app.models import Base
from app.models.settings import Settings
from app.models.donation import Donation

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
        otp_enabled=True
    )
    session.add(s)
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

def test_initialize_donation_success(client: TestClient, db: Session):
    settings.paystack_secret_key = "sk_test_mocked"
    
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json = lambda: {
        "status": True,
        "message": "Authorization URL created",
        "data": {
            "authorization_url": "https://checkout.paystack.com/mocked_url",
            "access_code": "mocked_code",
            "reference": "don_123"
        }
    }

    with patch("httpx.AsyncClient.post", return_value=mock_response):
        res = client.post("/donations/initialize", json={
            "amount_minor": 10000,
            "is_anonymous": False,
            "donor_name": "Test Donor",
            "donor_email": "test@example.com"
        })
        
    assert res.status_code == 200
    assert res.json()["authorization_url"] == "https://checkout.paystack.com/mocked_url"
    
    # Verify DB creation
    donation = db.query(Donation).first()
    assert donation is not None
    assert donation.amount_minor == 10000
    assert donation.status == "pending"
    assert donation.donor_name == "Test Donor"

def test_paystack_webhook_valid_signature(client: TestClient, db: Session):
    settings.paystack_secret_key = "sk_test_mocked"
    
    # Create pending donation
    d = Donation(
        reference="mocked_ref",
        amount_minor=5000,
        currency="GHS",
        status="pending",
        is_anonymous=True,
    )
    db.add(d)
    db.commit()
    
    payload = b'{"event": "charge.success", "data": {"reference": "mocked_ref", "amount": 5000}}'
    
    # Create valid HMAC
    signature = hmac.new(
        b"sk_test_mocked",
        payload,
        hashlib.sha512
    ).hexdigest()
    
    res = client.post("/webhooks/paystack", content=payload, headers={"x-paystack-signature": signature})
    
    assert res.status_code == 200
    db.refresh(d)
    assert d.status == "success"
    assert d.paid_at is not None

def test_paystack_webhook_invalid_signature(client: TestClient, db: Session):
    settings.paystack_secret_key = "sk_test_mocked"
    
    payload = b'{"event": "charge.success", "data": {"reference": "mocked_ref", "amount": 5000}}'
    
    res = client.post("/webhooks/paystack", content=payload, headers={"x-paystack-signature": "invalid_sig"})
    
    assert res.status_code == 400
    assert res.json()["detail"] == "Invalid signature"
