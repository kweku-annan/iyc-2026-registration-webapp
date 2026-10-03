"""SMS Provider interface and implementations.

Handles sending SMS messages and logging every attempt to the database.
"""

from __future__ import annotations

import abc
import json
import logging
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.sms_log import SmsLog

logger = logging.getLogger(__name__)


@dataclass
class SmsResult:
    """Result of an SMS send attempt."""
    status: str  # "sent" | "failed"
    provider_response: str | None = None


class SmsProvider(abc.ABC):
    """Base interface for all SMS providers."""

    @abc.abstractmethod
    def send(self, to_e164: str, message: str) -> SmsResult:
        """Send an SMS message and return the result."""
        pass


class ConsoleSmsProvider(SmsProvider):
    """Dummy provider that just prints to the console (used for dev/test)."""

    def send(self, to_e164: str, message: str) -> SmsResult:
        print(f"\n[CONSOLE SMS] To: {to_e164}\n[CONSOLE SMS] Message:\n{message}\n")
        return SmsResult(
            status="sent",
            provider_response=json.dumps({"console": True, "delivered": True, "message": message})
        )


class MnotifySmsProvider(SmsProvider):
    """mNotify implementation for production SMS delivery in Ghana.

    NOTE: Awaiting actual API docs from the user before implementing the real HTTP calls.
    """

    def send(self, to_e164: str, message: str) -> SmsResult:
        # STUB: Real implementation deferred until mNotify docs are provided.
        logger.warning(f"MnotifySmsProvider is a stub. Would send to {to_e164}: {message}")
        return SmsResult(
            status="failed",
            provider_response="STUB_NOT_IMPLEMENTED"
        )


def get_sms_provider() -> SmsProvider:
    """Factory returning the configured SMS provider instance."""
    if settings.sms_provider == "mnotify":
        return MnotifySmsProvider()
    return ConsoleSmsProvider()


def send_sms(
    db: Session,
    to_phone: str,
    template: str,
    message: str,
    registration_id: int | None = None
) -> SmsResult:
    """Send an SMS via the configured provider and log it to the database.

    Args:
        db: The SQLAlchemy session.
        to_phone: The normalized E.164 phone number.
        template: Short name for the template used (e.g. "otp", "confirmation").
        message: The actual SMS text body.
        registration_id: Optional FK if this SMS is linked to an existing registration.

    Returns:
        The SmsResult from the provider.
    """
    provider = get_sms_provider()

    # Catch any unexpected exceptions from the provider to ensure we still log a failure
    try:
        result = provider.send(to_e164=to_phone, message=message)
    except Exception as exc:
        logger.exception("SMS provider threw an unexpected exception")
        result = SmsResult(
            status="failed",
            provider_response=f"EXCEPTION: {exc!s}"
        )

    # Always log the attempt
    log_entry = SmsLog(
        registration_id=registration_id,
        to_phone=to_phone,
        template=template,
        status=result.status,
        provider_response=result.provider_response,
    )
    db.add(log_entry)
    db.commit()

    return result
