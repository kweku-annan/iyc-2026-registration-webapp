"""SMS Provider interface and implementations.

Handles sending SMS messages and logging every attempt to the database.
"""

from __future__ import annotations

import abc
import json
import requests
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
        logger.info(
            "[CONSOLE SMS] To: %s | Message: %s",
            to_e164,
            message,
        )
        print(f"[CONSOLE SMS] To: {to_e164} | Message: {message}")
        return SmsResult(
            status="sent",
            provider_response=json.dumps({"console": True, "delivered": True, "message": message})
        )


class MnotifySmsProvider(SmsProvider):
    """mNotify implementation for production SMS delivery in Ghana.

    NOTE: Awaiting actual API docs from the user before implementing the real HTTP calls.
    """

    def send(self, to_e164: str, message: str) -> SmsResult:
        endpoint = str(settings.mnotify_endpoint)
        api_key = str(settings.mnotify_api_key)

        # NOTE: The API key is currently passed as a query parameter because
        # mNotify's documented endpoint uses ?key=. This means the key may
        # appear in server/proxy access logs. If mNotify adds header-based auth
        # (e.g. Authorization: Bearer), migrate the key there and remove it
        # from the URL.
        response = requests.post(
            f"{endpoint}?key={api_key}",
            json={
                "recipient": [to_e164],
                "message": message,
                "sender": settings.sms_sender_id,
                "is_schedule": False,
                "schedule_date": ""
            },
            timeout=15,
        )
        response.raise_for_status()

        response_data = response.json()
        summary = response_data.get("summary") or {}

        successful = (
            response_data.get("status") == "success"
            and response_data.get("code") == "2000"
            and summary.get("total_rejected", 0) == 0
        )

        result =  SmsResult(
            status="sent" if successful else "failed",
            provider_response=json.dumps(response_data),
        )

        logger.info(
            "mNotify SMS result: status=%s provider_status=%s code=%s "
            "total_sent=%s total_rejected=%s message=%s credit_left=%s, credit_used=%s",
            result.status,
            response_data.get("status"),
            response_data.get("code"),
            summary.get("total_sent"),
            summary.get("total_rejected"),
            response_data.get("message"),
            summary.get("credit_left"),
            summary.get("credit_used")

        )

        return result



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
    provider_name = type(provider).__name__

    # Mask the phone for privacy in logs (keep country code + last 4 digits)
    masked_phone = to_phone[:-4].replace(to_phone[:-4], "*" * len(to_phone[:-4])) + to_phone[-4:]

    logger.info(
        "SMS send attempt: provider=%s template=%s to=%s registration_id=%s",
        provider_name,
        template,
        masked_phone,
        registration_id,
    )

    # Catch any unexpected exceptions from the provider to ensure we still log a failure
    try:
        result = provider.send(to_e164=to_phone, message=message)
    except Exception as exc:
        logger.exception(
            "SMS provider threw an unexpected exception: provider=%s template=%s to=%s",
            provider_name,
            template,
            masked_phone,
        )
        result = SmsResult(
            status="failed",
            provider_response=f"EXCEPTION: {exc!s}"
        )

    if result.status == "sent":
        logger.info(
            "SMS delivered successfully: provider=%s template=%s to=%s registration_id=%s",
            provider_name,
            template,
            masked_phone,
            registration_id,
        )
    else:
        logger.warning(
            "SMS delivery failed: provider=%s template=%s to=%s registration_id=%s response=%s",
            provider_name,
            template,
            masked_phone,
            registration_id,
            result.provider_response,
        )

    # Always log the attempt to the database
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
