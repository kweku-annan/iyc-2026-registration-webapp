import secrets
import httpx
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import AppError
from app.models.donation import Donation
from app.schemas.donation import DonationInitializeRequest, DonationInitializeResponse

router = APIRouter(prefix="/donations", tags=["donations"])

@router.post("/initialize", response_model=DonationInitializeResponse)
async def initialize_donation(
    payload: DonationInitializeRequest,
    db: Session = Depends(get_db)
):
    if not settings.paystack_secret_key:
        raise AppError("Payments are not configured yet.", code="payments_disabled", status_code=503)

    # 1. Create a unique reference
    reference = f"don_{secrets.token_urlsafe(12)}"

    # 2. Store a pending donation
    donation = Donation(
        reference=reference,
        amount_minor=payload.amount_minor,
        currency="GHS",
        status="pending",
        is_anonymous=payload.is_anonymous,
        donor_name=payload.donor_name if not payload.is_anonymous else None,
        donor_email=payload.donor_email if not payload.is_anonymous else "anonymous@iyc2026.com",
    )
    db.add(donation)
    db.commit()

    # 3. Call Paystack API
    # Amount is in pesewas.
    # We must supply an email to Paystack.
    email_for_paystack = donation.donor_email or "anonymous@iyc2026.com"
    
    url = "https://api.paystack.co/transaction/initialize"
    headers = {
        "Authorization": f"Bearer {settings.paystack_secret_key}",
        "Content-Type": "application/json",
    }
    data = {
        "email": email_for_paystack,
        "amount": donation.amount_minor,
        "currency": "GHS",
        "reference": donation.reference,
        "callback_url": f"{settings.frontend_origin}/donate/thanks",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=data)

    if response.status_code != 200:
        db.delete(donation)
        db.commit()
        # Log this securely in reality.
        raise AppError("Failed to initialize payment gateway.", code="paystack_error", status_code=502)

    paystack_data = response.json()
    if not paystack_data.get("status"):
        db.delete(donation)
        db.commit()
        raise AppError("Failed to initialize payment gateway.", code="paystack_error", status_code=502)

    return DonationInitializeResponse(
        authorization_url=paystack_data["data"]["authorization_url"]
    )
