"""SQLAlchemy engine and session factory.

Usage in FastAPI routes:
    from app.core.database import get_db
    ...
    def my_route(db: Session = Depends(get_db)):
        ...
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.database_url,
    # Use a connection pool sized for FastAPI's thread-per-request model.
    pool_pre_ping=True,  # verify connections before use
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
