import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app
from app.models.base import Base
from app.models.registration import Registration
from app.models.user import User
from app.core.security import generate_csrf_token, create_signed_session_token, hash_password

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture()
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    vol = User(email="vol@test.com", password_hash=hash_password("test"), role="volunteer")
    session.add(vol)
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

def test_lookup_registration(client: TestClient, db: Session):
    headers = get_auth_headers(db, "vol@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])
    
    reg = Registration(
        full_name="John Doe",
        phone_e164="+233201234567",
        church="Grace",
        attended_before=False,
        ticket_code="TESTCODE",
        ticket_token="tok1",
        source="online"
    )
    db.add(reg)
    db.commit()

    res = client.get("/checkin/lookup/TESTCODE", headers={"X-CSRF-Token": headers["X-CSRF-Token"]})
    assert res.status_code == 200
    assert res.json()["full_name"] == "John Doe"

def test_search_registration(client: TestClient, db: Session):
    headers = get_auth_headers(db, "vol@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])

    reg = Registration(
        full_name="John Doe",
        phone_e164="+233201234567",
        church="Grace",
        attended_before=False,
        ticket_code="TESTCODE",
        ticket_token="tok1",
        source="online"
    )
    db.add(reg)
    db.commit()

    res = client.get("/checkin/search?q=John", headers={"X-CSRF-Token": headers["X-CSRF-Token"]})
    assert res.status_code == 200
    assert len(res.json()) >= 1
    assert res.json()[0]["full_name"] == "John Doe"

def test_confirm_checkin(client: TestClient, db: Session):
    headers = get_auth_headers(db, "vol@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])
    
    reg = Registration(
        full_name="John Doe",
        phone_e164="+233201234567",
        church="Grace",
        attended_before=False,
        ticket_code="TESTCODE",
        ticket_token="tok1",
        source="online"
    )
    db.add(reg)
    db.commit()

    res = client.post("/checkin/confirm/TESTCODE", headers={"X-CSRF-Token": headers["X-CSRF-Token"]})
    assert res.status_code == 200
    assert "checked_in_at" in res.json()

    # Second time should fail
    res2 = client.post("/checkin/confirm/TESTCODE", headers={"X-CSRF-Token": headers["X-CSRF-Token"]})
    assert res2.status_code == 400
    assert "Already checked in at" in res2.json()["detail"]

def test_walk_in(client: TestClient, db: Session):
    headers = get_auth_headers(db, "vol@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])

    payload = {
        "full_name": "Walkin User",
        "phone": "0540001111",
        "church": "ICGC",
        "attended_before": True
    }

    res = client.post("/checkin/walk-in", json=payload, headers={"X-CSRF-Token": headers["X-CSRF-Token"]})
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Walkin User"
    assert data["source"] == "walk_in"
    assert data["checked_in_at"] is not None

def test_walk_in_duplicate_phone(client: TestClient, db: Session):
    headers = get_auth_headers(db, "vol@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])

    payload = {
        "full_name": "Walkin User",
        "phone": "0540001111", # same local phone
        "church": "ICGC",
        "attended_before": True
    }
    
    client.post("/checkin/walk-in", json=payload, headers={"X-CSRF-Token": headers["X-CSRF-Token"]})

    res = client.post("/checkin/walk-in", json=payload, headers={"X-CSRF-Token": headers["X-CSRF-Token"]})
    assert res.status_code == 400
    assert "already registered" in res.json()["detail"]
