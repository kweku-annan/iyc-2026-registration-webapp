"""Make date_of_birth a string and age nullable to support partial dates

Year in date_of_birth is now optional on the registration form.
  - date_of_birth: Date  ->  VARCHAR(10)  (stores YYYY-MM-DD or MM-DD)
  - age:           INTEGER NOT NULL  ->  INTEGER NULL  (NULL when year is absent)

Revision ID: a1b2c3d4e5f6
Revises: 82c61a6dc345
Create Date: 2026-10-15 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '82c61a6dc345'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Convert date_of_birth from DATE to VARCHAR(10) and make age nullable.

    PostgreSQL requires explicit USING clause to cast DATE → VARCHAR.
    Existing rows keep their full date string in ISO format (YYYY-MM-DD).
    """
    # 1. Convert date_of_birth: DATE -> VARCHAR(10)
    #    USING casts the existing DATE values to their text representation.
    op.alter_column(
        'registrations',
        'date_of_birth',
        existing_type=sa.Date(),
        type_=sa.String(length=10),
        postgresql_using="date_of_birth::text",
        nullable=False,
    )

    # 2. Make age nullable (year may now be absent → cannot compute age)
    op.alter_column(
        'registrations',
        'age',
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    """Revert: VARCHAR(10) -> DATE and make age NOT NULL again.

    Rows that only have MM-DD will be coerced to 1900-MM-DD so the cast
    does not fail. This is a best-effort downgrade — the year information
    is already lost for partial-date registrants.
    """
    # 1. Make age NOT NULL again — fill any NULLs with 0 first
    op.execute("UPDATE registrations SET age = 0 WHERE age IS NULL")
    op.alter_column(
        'registrations',
        'age',
        existing_type=sa.Integer(),
        nullable=False,
    )

    # 2. Revert date_of_birth back to DATE
    #    Partial dates (MM-DD) get padded to 1900-MM-DD before the cast.
    op.execute(
        """
        UPDATE registrations
        SET date_of_birth = '1900-' || date_of_birth
        WHERE date_of_birth ~ '^\\d{2}-\\d{2}$'
        """
    )
    op.alter_column(
        'registrations',
        'date_of_birth',
        existing_type=sa.String(length=10),
        type_=sa.Date(),
        postgresql_using="date_of_birth::date",
        nullable=False,
    )
