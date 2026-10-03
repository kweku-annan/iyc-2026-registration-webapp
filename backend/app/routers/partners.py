from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.partner import Partner
from app.schemas.partner import Partner as PartnerSchema

router = APIRouter(prefix="/partners", tags=["partners"])

@router.get("", response_model=List[PartnerSchema])
def get_active_partners(db: Session = Depends(get_db)):
    """Get all active partners ordered by sort_order."""
    stmt = (
        select(Partner)
        .where(Partner.is_active == True)
        .order_by(Partner.sort_order.asc(), Partner.name.asc())
    )
    return db.execute(stmt).scalars().all()
