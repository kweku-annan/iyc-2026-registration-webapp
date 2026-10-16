"""Tests for gallery public exhibition and admin endpoints."""

import io
from datetime import UTC, datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.dependencies import require_organizer, verify_csrf
from app.main import app
from app.models import Base
from app.models.gallery import GalleryPhoto
from app.models.settings import Settings
from app.models.user import User


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
        otp_enabled=True,
    )
    session.add(settings)
    session.commit()

    yield session
    session.close()


@pytest.fixture()
def client(db: Session) -> TestClient:
    app.dependency_overrides[get_db] = lambda: db

    # Create dummy admin user and mock dependencies
    mock_user = User(id=1, email="admin@example.com", password_hash="hash", role="organizer", is_active=True)
    app.dependency_overrides[require_organizer] = lambda: mock_user
    app.dependency_overrides[verify_csrf] = lambda: None

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


def make_test_image(format="JPEG", size=(200, 200), color="blue") -> bytes:
    buf = io.BytesIO()
    im = Image.new("RGB", size, color=color)
    im.save(buf, format=format)
    return buf.getvalue()


def test_public_gallery_empty(client: TestClient):
    res = client.get("/gallery")
    assert res.status_code == 200
    data = res.json()
    assert data["items"] == []
    assert data["categories"] == []


def test_public_gallery_visibility_filtering(client: TestClient, db: Session):
    p1 = GalleryPhoto(
        slug="p1",
        title="Visible Photo",
        category="Worship & Praise",
        year=2025,
        thumb_url="/uploads/gallery/thumbs/p1.webp",
        full_url="/uploads/gallery/full/p1.webp",
        width=800,
        height=600,
        is_visible=True,
        sort_order=1,
    )
    p2 = GalleryPhoto(
        slug="p2",
        title="Hidden Photo",
        category="Camp Atmosphere",
        year=2025,
        thumb_url="/uploads/gallery/thumbs/p2.webp",
        full_url="/uploads/gallery/full/p2.webp",
        width=800,
        height=600,
        is_visible=False,
        sort_order=2,
    )
    db.add_all([p1, p2])
    db.commit()

    res = client.get("/gallery")
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Visible Photo"
    assert "Worship & Praise" in data["categories"]
    assert "Camp Atmosphere" not in data["categories"]


def test_admin_upload_and_manage(client: TestClient, db: Session):
    img_bytes = make_test_image("PNG")

    # Upload photo
    res = client.post(
        "/admin/gallery/upload",
        data={
            "title": "Uploaded Night",
            "caption": "Praise in the hall",
            "category": "Worship & Praise",
            "year": 2025,
            "is_visible": True,
            "sort_order": 1,
        },
        files={"file": ("test.png", img_bytes, "image/png")},
    )
    assert res.status_code == 200
    photo = res.json()
    assert photo["title"] == "Uploaded Night"
    photo_id = photo["id"]

    # Update photo (hide it)
    update_res = client.patch(
        f"/admin/gallery/{photo_id}",
        json={"is_visible": False, "category": "Youth Leadership"},
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["is_visible"] is False
    assert updated["category"] == "Youth Leadership"

    # Public gallery should not show it now
    pub_res = client.get("/gallery")
    assert len(pub_res.json()["items"]) == 0

    # Delete photo
    del_res = client.delete(f"/admin/gallery/{photo_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True
