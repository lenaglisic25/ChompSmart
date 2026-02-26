"""add fiber and sugar to meals

Revision ID: 281f0e52caa5
Revises: 
Create Date: 2026-02-22 18:54:04.255366

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '281f0e52caa5'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('meals', sa.Column('fiber', sa.Float(), nullable=True))
    op.add_column('meals', sa.Column('sugar', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('meals', 'sugar')
    op.drop_column('meals', 'fiber')
    # ### end Alembic commands ###