import hmac
import hashlib
from datetime import datetime, UTC
from fastapi import APIRouter, Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.models.donation import Donation

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

@router.post("/paystack")
async def paystack_webhook(request: Request, db: Session = Depends(get_db)):
    signature = request.headers.get("x-paystack-signature")
    if not signature:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing signature")

    body = await request.body()
    
    if not settings.paystack_secret_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Paystack not configured")

    # Validate HMAC-SHA512
    expected_signature = hmac.new(
        settings.paystack_secret_key.encode("utf-8"),
        body,
        hashlib.sha512
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

    # Parse JSON
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload")

    event = data.get("event")
    
    if event == "charge.success":
        charge_data = data.get("data", {})
        reference = charge_data.get("reference")
        amount = charge_data.get("amount") # minor currency

        if reference:
            stmt = select(Donation).where(Donation.reference == reference)
            donation = db.execute(stmt).scalar_one_or_none()

            if donation and donation.status != "success":
                # Ensure the amount matches to prevent tampering
                if donation.amount_minor == amount:
                    donation.status = "success"
                    donation.paid_at = datetime.now(UTC)
                    db.commit()

    # Always return 200 OK to Paystack
    return {"status": "success"}
