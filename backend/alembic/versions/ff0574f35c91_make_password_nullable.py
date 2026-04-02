"""make password nullable

Revision ID: ff0574f35c91
Revises: c7a852f44455
Create Date: 2026-04-02 17:32:02.633720

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'ff0574f35c91'
down_revision = 'c7a852f44455'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('password',
                              existing_type=sa.String(),
                              nullable=True)

def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('password',
                              existing_type=sa.String(),
                              nullable=False)