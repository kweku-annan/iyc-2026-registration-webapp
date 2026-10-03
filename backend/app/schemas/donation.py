from pydantic import BaseModel, ConfigDict, Field, EmailStr
from typing import Optional
from datetime import datetime

class DonationInitializeRequest(BaseModel):
    amount_minor: int = Field(..., gt=0, description="Amount in pesewas")
    is_anonymous: bool = Field(default=False)
    donor_name: Optional[str] = Field(None, max_length=255)
    donor_email: Optional[EmailStr] = Field(None, max_length=255)

class DonationInitializeResponse(BaseModel):
    authorization_url: str

class DonationAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reference: str
    amount_minor: int
    currency: str
    status: str
    is_anonymous: bool
    donor_name: Optional[str]
    donor_email: Optional[str]
    created_at: datetime
    paid_at: Optional[datetime]
