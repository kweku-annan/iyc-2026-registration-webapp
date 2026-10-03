from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional

class CheckinLookupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    full_name: str
    phone_e164: str
    church: str
    ticket_code: str
    registered_at: datetime
    checked_in_at: Optional[datetime]
    source: str

class WalkInRegistrationCreate(BaseModel):
    full_name: str
    phone: str  # Frontend sends local or intl, backend normalizes
    church: str
    attended_before: bool

class CheckinConfirmResponse(BaseModel):
    detail: str
    checked_in_at: datetime
