"""Initial schema — all tables.

Revision ID: 0001
Revises:
Create Date: 2026-10-01
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | None = None
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ── settings (single row) ─────────────────────────────────────────────────
    op.create_table(
        "settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("registration_open", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("registration_closes_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("event_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("event_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("otp_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.PrimaryKeyConstraint("id", name="pk_settings"),
        sa.CheckConstraint("id = 1", name="ck_settings_single_row"),
    )

    # ── registrations ─────────────────────────────────────────────────────────
    op.create_table(
        "registrations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("phone_e164", sa.String(20), nullable=False),
        sa.Column("church", sa.String(255), nullable=False),
        sa.Column("attended_before", sa.Boolean(), nullable=False),
        sa.Column("ticket_code", sa.String(8), nullable=False),
        sa.Column("ticket_token", sa.String(64), nullable=False),
        sa.Column("source", sa.String(10), nullable=False, server_default="online"),
        sa.Column("phone_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "registered_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("checked_in_by", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_registrations"),
        sa.UniqueConstraint("phone_e164", name="uq_registrations_phone_e164"),
        sa.UniqueConstraint("ticket_code", name="uq_registrations_ticket_code"),
        sa.UniqueConstraint("ticket_token", name="uq_registrations_ticket_token"),
        sa.ForeignKeyConstraint(
            ["checked_in_by"],
            ["users.id"],
            name="fk_registrations_checked_in_by",
            ondelete="SET NULL",
        ),
    )
    op.create_index("ix_registrations_phone_e164", "registrations", ["phone_e164"], unique=True)
    op.create_index("ix_registrations_ticket_code", "registrations", ["ticket_code"], unique=True)

    # ── otp_codes ─────────────────────────────────────────────────────────────
    op.create_table(
        "otp_codes",
        sa.Column("phone_e164", sa.String(20), nullable=False),
        sa.Column("code_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("phone_e164", name="pk_otp_codes"),
    )

    # ── sms_log ───────────────────────────────────────────────────────────────
    op.create_table(
        "sms_log",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("registration_id", sa.Integer(), nullable=True),
        sa.Column("to_phone", sa.String(20), nullable=False),
        sa.Column("template", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("provider_response", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id", name="pk_sms_log"),
        sa.ForeignKeyConstraint(
            ["registration_id"],
            ["registrations.id"],
            name="fk_sms_log_registration_id",
            ondelete="SET NULL",
        ),
    )
    op.create_index("ix_sms_log_registration_id", "sms_log", ["registration_id"])

    # ── testimonials ──────────────────────────────────────────────────────────
    op.create_table(
        "testimonials",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("privacy_mode", sa.String(30), nullable=False),
        sa.Column("display_name", sa.String(100), nullable=True),
        sa.Column("private_name", sa.String(100), nullable=True),
        sa.Column("alias_name", sa.String(50), nullable=True),
        sa.Column("registration_id", sa.Integer(), nullable=True),
        sa.Column("consent", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id", name="pk_testimonials"),
        sa.ForeignKeyConstraint(
            ["registration_id"],
            ["registrations.id"],
            name="fk_testimonials_registration_id",
            ondelete="SET NULL",
        ),
    )

    # ── donations ─────────────────────────────────────────────────────────────
    op.create_table(
        "donations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("reference", sa.String(100), nullable=False),
        sa.Column("amount_minor", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="GHS"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("is_anonymous", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("donor_name", sa.String(255), nullable=True),
        sa.Column("donor_email", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_donations"),
        sa.UniqueConstraint("reference", name="uq_donations_reference"),
    )
    op.create_index("ix_donations_reference", "donations", ["reference"], unique=True)

    # ── partners ──────────────────────────────────────────────────────────────
    op.create_table(
        "partners",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("logo_url", sa.String(500), nullable=False),
        sa.Column("website_url", sa.String(500), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.PrimaryKeyConstraint("id", name="pk_partners"),
    )


def downgrade() -> None:
    op.drop_table("partners")
    op.drop_table("donations")
    op.drop_table("testimonials")
    op.drop_index("ix_sms_log_registration_id", table_name="sms_log")
    op.drop_table("sms_log")
    op.drop_table("otp_codes")
    op.drop_index("ix_registrations_ticket_code", table_name="registrations")
    op.drop_index("ix_registrations_phone_e164", table_name="registrations")
    op.drop_table("registrations")
    op.drop_table("settings")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
