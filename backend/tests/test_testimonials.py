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
from app.models.testimonial import Testimonial

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

def test_submit_public_testimonial(client: TestClient, db: Session):
    response = client.post(
        "/testimonials",
        json={
            "body": "This is a great testimony that is public.",
            "privacy_mode": "public",
            "display_name": "John Doe",
            "consent": True
        }
    )
    assert response.status_code == 201
    
    t = db.query(Testimonial).filter_by(display_name="John Doe").first()
    assert t is not None
    assert t.status == "pending"
    assert t.private_name is None
    assert t.alias_name is None

def test_submit_anonymous_name_private(client: TestClient, db: Session):
    response = client.post(
        "/testimonials",
        json={
            "body": "This is a great testimony that is private.",
            "privacy_mode": "anonymous_name_private",
            "private_name": "Jane Doe",
            "consent": True
        }
    )
    assert response.status_code == 201
    
    t = db.query(Testimonial).filter_by(private_name="Jane Doe").first()
    assert t is not None
    assert t.alias_name is not None
    assert t.display_name is None

def test_get_featured_testimonials(client: TestClient, db: Session):
    # Setup: Create some testimonials
    t1 = Testimonial(body="Public featured", privacy_mode="public", display_name="Public User", consent=True, status="approved", featured=True)
    t2 = Testimonial(body="Private featured", privacy_mode="anonymous_name_private", private_name="Secret Name", alias_name="Grace", consent=True, status="approved", featured=True)
    t3 = Testimonial(body="Pending public", privacy_mode="public", display_name="Pending User", consent=True, status="pending", featured=False)
    
    db.add_all([t1, t2, t3])
    db.commit()
    
    response = client.get("/testimonials/featured")
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) >= 2 # There might be others from other tests, but at least these 2
    
    # Verify no private_name leaks and computed_name works
    for item in data:
        assert "private_name" not in item
        assert "computed_name" in item
        if item["body"] == "Private featured":
            assert item["computed_name"] == "Grace (Anonymous)"
        if item["body"] == "Public featured":
            assert item["computed_name"] == "Public User"
