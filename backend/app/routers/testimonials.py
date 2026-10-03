import secrets
import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.testimonial import Testimonial
from app.schemas.testimonial import TestimonialCreate, TestimonialPublic

router = APIRouter(prefix="/testimonials", tags=["testimonials"])

ALIAS_NAMES = [
    "Grace", "David", "Mary", "Samuel", "Esther", "John", "Sarah", 
    "Daniel", "Ruth", "Joseph", "Hannah", "Isaac", "Abigail", "Elijah",
    "Joy", "Emmanuel", "Blessing", "Faith", "Hope", "Peace"
]

@router.post("", status_code=status.HTTP_201_CREATED)
def submit_testimonial(
    testimonial_in: TestimonialCreate,
    db: Session = Depends(get_db)
):
    """
    Submit a new testimonial. Status defaults to pending.
    Generates a random alias if privacy mode is anonymous.
    """
    testimonial = Testimonial(
        body=testimonial_in.body,
        privacy_mode=testimonial_in.privacy_mode,
        display_name=testimonial_in.display_name if testimonial_in.privacy_mode == "public" else None,
        private_name=testimonial_in.private_name if testimonial_in.privacy_mode == "anonymous_name_private" else None,
        consent=testimonial_in.consent,
    )
    
    if testimonial_in.privacy_mode in ["anonymous_name_private", "anonymous_no_name"]:
        testimonial.alias_name = random.choice(ALIAS_NAMES)
        
    db.add(testimonial)
    db.commit()
    
    return {"message": "Testimony submitted successfully"}

@router.get("/featured", response_model=List[TestimonialPublic])
def get_featured_testimonials(
    db: Session = Depends(get_db)
):
    """
    Get all featured and approved testimonials for the landing page carousel.
    """
    stmt = (
        select(Testimonial)
        .where(Testimonial.status == "approved")
        .where(Testimonial.featured == True)
        .order_by(Testimonial.created_at.desc())
    )
    
    testimonials = db.execute(stmt).scalars().all()
    return testimonials
