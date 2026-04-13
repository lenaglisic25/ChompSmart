"""add verified and user type columns

Revision ID: c7a852f44455
Revises: d3b084ef78d9
Create Date: 2026-04-02 17:26:40.816463

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'c7a852f44455'
down_revision = 'd3b084ef78d9'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Check if columns already exist
    connection = op.get_context().bind
    inspector = inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'is_verified' not in columns:
        op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=True))
    if 'user_type' not in columns:
        op.add_column('users', sa.Column('user_type', sa.String(), nullable=True))

def downgrade() -> None:
    connection = op.get_context().bind
    inspector = inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'user_type' in columns:
        op.drop_column('users', 'user_type')
    if 'is_verified' in columns:
        op.drop_column('users', 'is_verified')