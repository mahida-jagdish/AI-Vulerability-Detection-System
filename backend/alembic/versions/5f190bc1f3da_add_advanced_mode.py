"""add_advanced_mode

Revision ID: 5f190bc1f3da
Revises: 0001_initial
Create Date: 2026-03-02 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5f190bc1f3da'
down_revision: Union[str, None] = '0001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('scan_jobs', sa.Column('advanced_mode', sa.Boolean(), server_default='0', nullable=False))


def downgrade() -> None:
    op.drop_column('scan_jobs', 'advanced_mode')
