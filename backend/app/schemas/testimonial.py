from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Optional, Literal

PrivacyMode = Literal["public", "anonymous_name_private", "anonymous_no_name"]
TestimonialStatus = Literal["pending", "approved", "rejected"]

class TestimonialCreate(BaseModel):
    body: str = Field(..., min_length=10, max_length=2000)
    privacy_mode: PrivacyMode
    display_name: Optional[str] = Field(None, max_length=100)
    private_name: Optional[str] = Field(None, max_length=100)
    consent: bool

    @model_validator(mode='after')
    def validate_names_and_consent(self) -> 'TestimonialCreate':
        if not self.consent:
            raise ValueError("Consent is required to submit a testimony.")
        
        if self.privacy_mode == "public" and not self.display_name:
            raise ValueError("Display name is required for public testimonies.")
            
        if self.privacy_mode == "anonymous_name_private" and not self.private_name:
            raise ValueError("Private name is required for this privacy mode.")
            
        return self

class TestimonialPublic(BaseModel):
    """Schema for public display (carousel). Never exposes private_name."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    body: str
    computed_name: str
    
    @model_validator(mode='before')
    @classmethod
    def compute_name(cls, data):
        # Allow passing dictionaries (for testing) or ORM models
        is_dict = isinstance(data, dict)
        privacy_mode = data.get("privacy_mode") if is_dict else getattr(data, "privacy_mode", None)
        
        computed_name = "Anonymous"
        
        if privacy_mode == "public":
            display_name = data.get("display_name") if is_dict else getattr(data, "display_name", None)
            computed_name = display_name or "Anonymous"
        else:
            alias_name = data.get("alias_name") if is_dict else getattr(data, "alias_name", None)
            if alias_name:
                computed_name = f"{alias_name} (Anonymous)"
        
        if is_dict:
            data["computed_name"] = computed_name
            return data
            
        # For ORM model, create a dict for Pydantic to parse
        return {
            "id": getattr(data, "id", None),
            "body": getattr(data, "body", None),
            "computed_name": computed_name
        }

class TestimonialAdmin(BaseModel):
    """Full schema for admin dashboard."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    body: str
    privacy_mode: PrivacyMode
    display_name: Optional[str]
    private_name: Optional[str]
    alias_name: Optional[str]
    registration_id: Optional[int]
    consent: bool
    status: TestimonialStatus
    featured: bool
    created_at: datetime

class TestimonialUpdate(BaseModel):
    """Schema for admin updates."""
    status: Optional[TestimonialStatus] = None
    featured: Optional[bool] = None
