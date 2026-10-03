"""Alembic migration environment.

Reads DATABASE_URL from the same .env file as the app (via app.core.config).
Run migrations with:  alembic upgrade head
"""

from __future__ import annotations

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# ── Make sure the app package is importable ───────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Import ALL models so their tables are registered on Base.metadata.
from app.models import Base  # noqa: E402  # also imports all model modules
from app.core.config import settings  # noqa: E402

# ── Alembic Config object ─────────────────────────────────────────────────────
config = context.config

# Interpret the config file for Python logging (if present).
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override sqlalchemy.url from our settings so we don't duplicate the DSN.
config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations without a live DB connection (generates SQL script)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live DB connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
