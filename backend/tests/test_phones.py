"""Tests for app/services/phones.py — phone number normalization.

Spec section 13 mandates:
  - 024..., +23324..., and 23324... map to the same record (same E.164 output)
  - A valid international number is accepted
  - Garbage is rejected

All tests call normalize_phone() directly; no DB or HTTP layer involved.
"""

from __future__ import annotations

import pytest

from app.core.exceptions import PhoneValidationError
from app.services.phones import normalize_phone

# ── Canonical Ghana number used throughout ────────────────────────────────────
# Ghana MTN number: 024 123 4567
# E.164 form:       +233241234567
EXPECTED_E164 = "+233241234567"


# ── Same-number equivalence tests ─────────────────────────────────────────────


def test_local_ghana_format_normalizes_correctly() -> None:
    """024xxxxxxx (local, no country code) → E.164 with +233."""
    assert normalize_phone("0241234567") == EXPECTED_E164


def test_e164_format_passthrough() -> None:
    """+23324xxxxxxx (already E.164) → same E.164."""
    assert normalize_phone("+233241234567") == EXPECTED_E164


def test_international_without_plus_normalizes() -> None:
    """23324xxxxxxx (country code, no leading +) → same E.164."""
    assert normalize_phone("233241234567") == EXPECTED_E164


def test_all_three_formats_are_equivalent() -> None:
    """Prove all three input formats produce the identical E.164 string."""
    results = {
        normalize_phone("0241234567"),
        normalize_phone("+233241234567"),
        normalize_phone("233241234567"),
    }
    assert len(results) == 1, f"Expected one unique E.164, got: {results}"
    assert results.pop() == EXPECTED_E164


def test_local_format_with_spaces_normalizes() -> None:
    """024 123 4567 (with spaces) → same E.164."""
    assert normalize_phone("024 123 4567") == EXPECTED_E164


def test_local_format_with_dashes_normalizes() -> None:
    """024-123-4567 (with dashes) → same E.164."""
    assert normalize_phone("024-123-4567") == EXPECTED_E164


# ── International number tests ─────────────────────────────────────────────────


def test_valid_uk_number_accepted() -> None:
    """A valid international number with +44 prefix is accepted as-is."""
    result = normalize_phone("+447911123456")
    assert result == "+447911123456"


def test_valid_us_number_accepted() -> None:
    """A valid international number with +1 prefix is accepted."""
    result = normalize_phone("+12025551234")
    assert result == "+12025551234"


def test_valid_nigerian_number_accepted() -> None:
    """A valid Nigerian number (+234) is accepted."""
    result = normalize_phone("+2348012345678")
    assert result == "+2348012345678"


# ── Region override tests ──────────────────────────────────────────────────────


def test_explicit_region_overrides_default() -> None:
    """Passing region='US' allows parsing a 10-digit US local number."""
    result = normalize_phone("2025551234", region="US")
    assert result == "+12025551234"


def test_gh_region_is_default() -> None:
    """Without an explicit region, GH is used (from settings)."""
    # 0302 is an Accra landline prefix.
    result = normalize_phone("0302123456")
    assert result.startswith("+233")


# ── Rejection tests ────────────────────────────────────────────────────────────


def test_garbage_string_rejected() -> None:
    """A non-numeric string raises PhoneValidationError."""
    with pytest.raises(PhoneValidationError):
        normalize_phone("not-a-number")


def test_empty_string_rejected() -> None:
    with pytest.raises(PhoneValidationError):
        normalize_phone("")


def test_too_short_rejected() -> None:
    """Too few digits — not a valid dialable number."""
    with pytest.raises(PhoneValidationError):
        normalize_phone("1234")


def test_too_long_rejected() -> None:
    """Nonsensically long number."""
    with pytest.raises(PhoneValidationError):
        normalize_phone("0" * 20)


def test_invalid_ghana_number_rejected() -> None:
    """10-digit number that starts with 0 but is not a valid Ghana number."""
    with pytest.raises(PhoneValidationError):
        normalize_phone("0001234567")


def test_error_has_correct_code() -> None:
    """PhoneValidationError carries code='invalid_phone' for the HTTP handler."""
    with pytest.raises(PhoneValidationError) as exc_info:
        normalize_phone("bad")
    assert exc_info.value.code == "invalid_phone"
    assert exc_info.value.status_code == 422
