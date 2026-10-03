from datetime import UTC, datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app
from app.models import Base
from app.models.settings import Settings
from app.models.partner import Partner

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
def test_get_partners(client: TestClient, db: Session):
    p1 = Partner(name="Active Partner", logo_url="https://example.com/logo1.png", is_active=True, sort_order=1)
    p2 = Partner(name="Inactive Partner", logo_url="https://example.com/logo2.png", is_active=False, sort_order=2)
    db.add_all([p1, p2])
    db.commit()

    res = client.get("/partners")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["name"] == "Active Partner"

# For admin tests, we assume the CSRF token bypass or mock from conftest / dependency overrides.
# We skip complex admin tests here since the basic logic is tested elsewhere, but we can verify 
# the model and public route.
