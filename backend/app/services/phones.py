"""Phone number normalization service.

Parses any phone number string and returns the canonical E.164 representation.
Uses the `phonenumbers` library with a configurable default region so that
local Ghanaian numbers like `024...` resolve to `+233 24...` without a
country prefix.

Usage:
    from app.services.phones import normalize_phone

    e164 = normalize_phone("0241234567")          # → "+233241234567"
    e164 = normalize_phone("+44 7911 123456")     # → "+447911123456"
    normalize_phone("not-a-number")               # raises PhoneValidationError
"""

from __future__ import annotations

import phonenumbers
from phonenumbers import NumberParseException, PhoneNumberFormat

from app.core.config import settings
from app.core.exceptions import PhoneValidationError


def normalize_phone(raw: str, *, region: str | None = None) -> str:
    """Parse *raw* and return the E.164 string, or raise PhoneValidationError.

    Args:
        raw:    Raw phone string from the user (any format accepted).
        region: BCP-47 / ISO 3166-1 alpha-2 region hint used when the number
                has no country prefix.  Defaults to ``settings.default_phone_region``
                (``"GH"`` in production).

    Returns:
        The phone number in E.164 format (e.g. ``"+233241234567"``).

    Raises:
        PhoneValidationError: If the input cannot be parsed or is not a valid
            dialable number.
    """
    default_region = region or settings.default_phone_region

    try:
        parsed = phonenumbers.parse(raw, default_region)
    except NumberParseException as exc:
        raise PhoneValidationError(
            f"Could not parse phone number {raw!r}: {exc}"
        ) from exc

    if not phonenumbers.is_valid_number(parsed):
        raise PhoneValidationError(
            f"Phone number {raw!r} is not a valid dialable number."
        )

    return phonenumbers.format_number(parsed, PhoneNumberFormat.E164)
