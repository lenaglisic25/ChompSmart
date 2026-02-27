"""add sugar tracking to profiles

Revision ID: 646efa9a484b
Revises: 281f0e52caa5
Create Date: 2026-02-22 21:34:55.510960

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '646efa9a484b'
down_revision = '281f0e52caa5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('profiles', sa.Column('sugar_g_max', sa.Float(), nullable=True))
    op.add_column('profiles', sa.Column('sugar_g_actual', sa.Float(), nullable=True))
    op.add_column('profiles', sa.Column('sugar_limit_g', sa.Float(), nullable=True))
    op.add_column('profiles', sa.Column('sugar_difference_from_limit', sa.Float(), nullable=True))
    op.add_column('profiles', sa.Column('sugar_message', sa.String(), nullable=True))
    op.add_column('profiles', sa.Column('sodium_mg_max', sa.Integer(), nullable=True))
    op.add_column('profiles', sa.Column('sodium_mg_actual', sa.Float(), nullable=True))
    op.add_column('profiles', sa.Column('sodium_fda_limit', sa.Integer(), nullable=True))
    op.add_column('profiles', sa.Column('sodium_difference_from_fda', sa.Float(), nullable=True))
    op.add_column('profiles', sa.Column('sodium_message', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('profiles', 'sodium_message')
    op.drop_column('profiles', 'sodium_difference_from_fda')
    op.drop_column('profiles', 'sodium_fda_limit')
    op.drop_column('profiles', 'sodium_mg_actual')
    op.drop_column('profiles', 'sodium_mg_max')
    op.drop_column('profiles', 'sugar_message')
    op.drop_column('profiles', 'sugar_difference_from_limit')
    op.drop_column('profiles', 'sugar_limit_g')
    op.drop_column('profiles', 'sugar_g_actual')
    op.drop_column('profiles', 'sugar_g_max')