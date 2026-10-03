"""Tickets endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.registration import Registration
from app.schemas.registration import TicketResponse

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("/{ticket_token}", response_model=TicketResponse)
def get_ticket(
    ticket_token: str,
    db: Session = Depends(get_db),  # noqa: B008
) -> TicketResponse:
    """Retrieve ticket details using a secure token."""
    registration = db.query(Registration).filter(Registration.ticket_token == ticket_token).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    return TicketResponse.model_validate(registration)
