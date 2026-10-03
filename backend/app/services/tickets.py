"""Ticket code and token generation service.

Generates 8-character, unambiguous, uppercase alphanumeric ticket codes.
Stored in DB as 8 chars (e.g. "A3K9M2P4"), formatted for display as "A3K9-M2P4".

Also generates high-entropy URL-safe tokens for personal ticket page URLs.
"""

from __future__ import annotations

import secrets

from sqlalchemy.orm import Session

from app.core.exceptions import TicketValidationError
from app.models.registration import Registration

# Unambiguous characters: A-Z, 2-9, excluding O, I, L.
# 0 and 1 are also excluded to avoid confusion with O, I, L.
UNAMBIGUOUS_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def generate_ticket_code() -> str:
    """Generate a random 8-character unambiguous ticket code.

    Format: XXXXXXXX (internal representation, no hyphen).
    """
    return "".join(secrets.choice(UNAMBIGUOUS_CHARS) for _ in range(8))


def generate_ticket_token() -> str:
    """Generate a high-entropy URL-safe token (>= 16 bytes entropy)."""
    return secrets.token_urlsafe(16)


def format_ticket_code(code: str) -> str:
    """Format an 8-character code as XXXX-XXXX for display.

    Raises:
        TicketValidationError: If the code is not exactly 8 characters.
    """
    if len(code) != 8:
        raise TicketValidationError(f"Code must be exactly 8 characters, got {len(code)}")
    return f"{code[:4]}-{code[4:]}"


def normalize_ticket_code(raw: str) -> str:
    """Normalize a raw string into an 8-character internal code.

    Removes hyphens, spaces, and uppercases.

    Raises:
        TicketValidationError: If the resulting code is not exactly 8 chars
            or contains invalid characters.
    """
    normalized = raw.replace("-", "").replace(" ", "").upper()
    if len(normalized) != 8:
        raise TicketValidationError("Normalized code must be exactly 8 characters.")

    invalid_chars = set(normalized) - set(UNAMBIGUOUS_CHARS)
    if invalid_chars:
        # Though users might type '0' instead of 'O', for now we reject strictly.
        raise TicketValidationError(f"Code contains invalid characters: {invalid_chars}")

    return normalized


def generate_unique_ticket_code(db: Session, max_retries: int = 3) -> str:
    """Generate a ticket code that is guaranteed unique in the DB.

    Raises:
        RuntimeError: If a unique code cannot be generated after max_retries.
    """
    for _ in range(max_retries):
        code = generate_ticket_code()
        # Check uniqueness. In a highly concurrent setup, we'd rely on the DB
        # unique constraint during insert. Since this is used before insert to
        # build the model, checking here is a good effort, and the DB constraint
        # provides the final safety net.
        exists = db.query(Registration.id).filter(Registration.ticket_code == code).first()
        if not exists:
            return code

    raise RuntimeError("Failed to generate a unique ticket code after maximum retries.")
