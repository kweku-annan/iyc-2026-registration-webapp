import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.user import User
from app.models.settings import Settings
from app.core.security import hash_password

def setup():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Ensure settings exist
    from datetime import datetime, timedelta
    if not db.query(Settings).first():
        db.add(Settings(
            registration_closes_at=datetime.utcnow() + timedelta(days=30),
            event_start=datetime.utcnow() + timedelta(days=31),
            event_end=datetime.utcnow() + timedelta(days=35)
        ))
        
    # Ensure admin user exists
    admin = db.query(User).filter(User.email == "admin@example.com").first()
    if not admin:
        admin = User(
            email="admin@example.com",
            password_hash=hash_password("admin123"),
            role="organizer",
            is_active=True
        )
        db.add(admin)
        
    db.commit()
    db.close()
    print("Database setup complete with admin@example.com / admin123")

if __name__ == "__main__":
    setup()
