"""Add is_readonly to rooms

Revision ID: c3d4e5f6a7b8
Revises: 3e41850b794e
Create Date: 2026-04-28 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('rooms')]
    if 'is_readonly' not in columns:
        with op.batch_alter_table('rooms', schema=None) as batch_op:
            batch_op.add_column(sa.Column('is_readonly', sa.Boolean(), nullable=False, server_default='0'))


def downgrade() -> None:
    with op.batch_alter_table('rooms', schema=None) as batch_op:
        batch_op.drop_column('is_readonly')
