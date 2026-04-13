"""add added_sugar and total_sugar to meals

Revision ID: add_sugar_cols_meals
Revises: ff0574f35c91
Create Date: 2026-04-13 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_sugar_cols_meals'
down_revision = 'ff0574f35c91'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('meals', sa.Column('total_sugar', sa.Float(), nullable=True, server_default='0.0'))


def downgrade() -> None:
    op.drop_column('meals', 'total_sugar')
