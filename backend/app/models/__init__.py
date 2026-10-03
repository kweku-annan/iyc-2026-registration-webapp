"""Models package — import all models so Alembic can discover them via Base.metadata."""

from app.models.base import Base
from app.models.donation import Donation
from app.models.otp_code import OtpCode
from app.models.partner import Partner
from app.models.registration import Registration
from app.models.settings import Settings
from app.models.sms_log import SmsLog
from app.models.testimonial import Testimonial
from app.models.user import User

__all__ = [
    "Base",
    "Donation",
    "OtpCode",
    "Partner",
    "Registration",
    "Settings",
    "SmsLog",
    "Testimonial",
    "User",
]
