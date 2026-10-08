from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional

class CheckinLookupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    first_name: str
    last_name: str
    other_names: Optional[str]
    date_of_birth: date
    age: int
    profession: str
    student_status: bool
    school_name: Optional[str]
    location: str
    accommodation_preference: str
    invitation_by_someone: bool
    invitation_by_who: Optional[str]
    attended_before: bool
    phone_e164: str
    church: str
    ticket_code: str
    registered_at: datetime
    checked_in_at: Optional[datetime]
    source: str

class WalkInRegistrationCreate(BaseModel):
    first_name: str
    last_name: str
    other_names: Optional[str] = None
    date_of_birth: date
    profession: str
    student_status: bool
    school_name: Optional[str] = None
    location: str
    accommodation_preference: str
    invitation_by_someone: bool
    invitation_by_who: Optional[str] = None
    phone: str  # Frontend sends local or intl, backend normalizes
    church: str
    attended_before: bool

class CheckinConfirmResponse(BaseModel):
    detail: str
    checked_in_at: datetime
