"""add file_size to items

Revision ID: a1b2c3d4e5f6
Revises: 3e41850b794e
Create Date: 2026-04-23 19:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '3e41850b794e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use batch mode for SQLite compatibility
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    
    columns = [col['name'] for col in inspector.get_columns('items')]
    if 'file_size' not in columns:
        with op.batch_alter_table('items') as batch_op:
            batch_op.add_column(sa.Column('file_size', sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('items') as batch_op:
        batch_op.drop_column('file_size')
