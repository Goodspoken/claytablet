"""add is_public and is_system to rooms

Revision ID: d1e2f3a4b5c6
Revises: c3d4e5f6a7b8
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa

revision = 'd1e2f3a4b5c6'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('rooms') as batch_op:
        batch_op.add_column(sa.Column('is_public', sa.Boolean(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('is_system', sa.Boolean(), nullable=False, server_default='0'))


def downgrade():
    with op.batch_alter_table('rooms') as batch_op:
        batch_op.drop_column('is_system')
        batch_op.drop_column('is_public')
