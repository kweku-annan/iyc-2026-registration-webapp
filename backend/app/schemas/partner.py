from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

class PartnerBase(BaseModel):
    name: str = Field(..., max_length=255)
    logo_url: str = Field(..., max_length=500)
    website_url: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=255)
    sort_order: int = Field(default=0)
    is_active: bool = Field(default=True)

class PartnerCreate(PartnerBase):
    pass

class PartnerUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    logo_url: Optional[str] = Field(None, max_length=500)
    website_url: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=255)
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

class Partner(PartnerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
