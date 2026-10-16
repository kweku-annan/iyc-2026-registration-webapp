"""Add gallery_photos table for dynamic gallery management

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-10-16 03:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a1'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'gallery_photos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('caption', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=False, server_default='Worship & Praise'),
        sa.Column('year', sa.Integer(), nullable=False, server_default='2025'),
        sa.Column('thumb_url', sa.String(length=500), nullable=False),
        sa.Column('full_url', sa.String(length=500), nullable=False),
        sa.Column('width', sa.Integer(), nullable=False, server_default='1200'),
        sa.Column('height', sa.Integer(), nullable=False, server_default='900'),
        sa.Column('alt_text', sa.String(length=500), nullable=True),
        sa.Column('is_visible', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_gallery_photos_slug'), 'gallery_photos', ['slug'], unique=True)
    op.create_index(op.f('ix_gallery_photos_category'), 'gallery_photos', ['category'], unique=False)
    op.create_index(op.f('ix_gallery_photos_is_visible'), 'gallery_photos', ['is_visible'], unique=False)
    op.create_index(op.f('ix_gallery_photos_sort_order'), 'gallery_photos', ['sort_order'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_gallery_photos_sort_order'), table_name='gallery_photos')
    op.drop_index(op.f('ix_gallery_photos_is_visible'), table_name='gallery_photos')
    op.drop_index(op.f('ix_gallery_photos_category'), table_name='gallery_photos')
    op.drop_index(op.f('ix_gallery_photos_slug'), table_name='gallery_photos')
    op.drop_table('gallery_photos')
