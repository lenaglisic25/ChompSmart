"""add verified and user type columns

Revision ID: c7a852f44455
Revises: 10301c011049
Create Date: 2026-04-02 17:26:40.816463

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c7a852f44455'
down_revision = '10301c011049'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=True))
    op.add_column('users', sa.Column('user_type', sa.String(), nullable=True))

def downgrade() -> None:
    op.drop_column('users', 'user_type')
    op.drop_column('users', 'is_verified')