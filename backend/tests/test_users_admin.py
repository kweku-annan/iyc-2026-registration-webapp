import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import generate_csrf_token, create_signed_session_token, verify_password, hash_password
from app.main import app
from app.models.base import Base
from app.models.user import User
from app.models.registration import Registration

# In-memory SQLite for testing
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

    org = User(email="org@test.com", password_hash=hash_password("test"), role="organizer")
    vol = User(email="vol@test.com", password_hash=hash_password("test"), role="volunteer")
    
    session.add_all([org, vol])
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

def test_get_admin_users(client: TestClient, db: Session):
    headers = get_auth_headers(db, "org@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])
    
    response = client.get("/admin/users", headers={"X-CSRF-Token": headers["X-CSRF-Token"]})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2
    assert any(u["email"] == "org@test.com" for u in data)

def test_create_admin_user(client: TestClient, db: Session):
    headers = get_auth_headers(db, "org@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])
    
    payload = {
        "email": "newvolunteer@example.com",
        "password": "strongpassword",
        "role": "volunteer"
    }
    response = client.post("/admin/users", json=payload, headers={"X-CSRF-Token": headers["X-CSRF-Token"]})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == payload["email"]
    assert data["role"] == payload["role"]
    assert "password" not in data

    user = db.query(User).filter_by(email="newvolunteer@example.com").first()
    assert user is not None
    assert verify_password("strongpassword", user.password_hash) is True

def test_create_admin_user_duplicate_email(client: TestClient, db: Session):
    headers = get_auth_headers(db, "org@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])
    
    payload = {
        "email": "org@test.com",
        "password": "anotherpassword",
        "role": "organizer"
    }
    response = client.post("/admin/users", json=payload, headers={"X-CSRF-Token": headers["X-CSRF-Token"]})
    assert response.status_code == 400
    assert response.json()["detail"] == "User with this email already exists."

def test_update_admin_user(client: TestClient, db: Session):
    headers = get_auth_headers(db, "org@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])
    
    payload = {
        "email": "update_me@example.com",
        "password": "oldpassword",
        "role": "volunteer"
    }
    create_response = client.post("/admin/users", json=payload, headers={"X-CSRF-Token": headers["X-CSRF-Token"]})
    user_id = create_response.json()["id"]

    update_payload = {
        "role": "organizer",
        "is_active": False,
        "password": "newpassword"
    }
    response = client.patch(f"/admin/users/{user_id}", json=update_payload, headers={"X-CSRF-Token": headers["X-CSRF-Token"]})
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "organizer"
    assert data["is_active"] is False

    db.expire_all()
    user = db.query(User).get(user_id)
    assert verify_password("newpassword", user.password_hash) is True

def test_delete_admin_user_success(client: TestClient, db: Session):
    headers = get_auth_headers(db, "org@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])
    
    payload = {
        "email": "delete_me@example.com",
        "password": "password",
        "role": "volunteer"
    }
    create_response = client.post("/admin/users", json=payload, headers={"X-CSRF-Token": headers["X-CSRF-Token"]})
    user_id = create_response.json()["id"]

    delete_response = client.delete(f"/admin/users/{user_id}", headers={"X-CSRF-Token": headers["X-CSRF-Token"]})
    assert delete_response.status_code == 200

    user = db.query(User).get(user_id)
    assert user is None

def test_delete_admin_user_with_history(client: TestClient, db: Session):
    headers = get_auth_headers(db, "org@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])
    
    payload = {
        "email": "history_user@example.com",
        "password": "password",
        "role": "volunteer"
    }
    create_response = client.post("/admin/users", json=payload, headers={"X-CSRF-Token": headers["X-CSRF-Token"]})
    user_id = create_response.json()["id"]

    reg = Registration(
        full_name="Checkin Tester",
        phone_e164="+233555555555",
        church="Test Church",
        attended_before=False,
        ticket_code="TEST1234",
        ticket_token="token123",
        source="online",
        checked_in_by=user_id
    )
    db.add(reg)
    db.commit()

    delete_response = client.delete(f"/admin/users/{user_id}", headers={"X-CSRF-Token": headers["X-CSRF-Token"]})
    assert delete_response.status_code == 400
    assert "Cannot delete a user who has checked in attendees" in delete_response.json()["detail"]

def test_volunteer_cannot_access_users(client: TestClient, db: Session):
    headers = get_auth_headers(db, "vol@test.com")
    client.cookies.set("session_token", headers["cookie"].split("=")[1])
    response = client.get("/admin/users", headers={"X-CSRF-Token": headers["X-CSRF-Token"]})
    assert response.status_code == 403
