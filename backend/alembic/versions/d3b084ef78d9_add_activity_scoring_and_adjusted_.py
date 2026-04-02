"""add activity scoring and adjusted calories

Revision ID: d3b084ef78d9
Revises: 371d41fe35f7
Create Date: 2026-04-02 16:02:41.195524

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd3b084ef78d9'
down_revision = '371d41fe35f7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('profiles', sa.Column('activity_daily_movement', sa.Integer(), nullable=True))
    op.add_column('profiles', sa.Column('activity_exercise_intensity', sa.Integer(), nullable=True))
    op.add_column('profiles', sa.Column('activity_moderate_minutes', sa.Integer(), nullable=True))
    op.add_column('profiles', sa.Column('activity_vigorous_minutes', sa.Integer(), nullable=True))
    op.add_column('profiles', sa.Column('activity_score', sa.Integer(), nullable=True))
    op.add_column('profiles', sa.Column('adjusted_calories_male', sa.Float(), nullable=True))
    op.add_column('profiles', sa.Column('adjusted_calories_female', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('profiles', 'adjusted_calories_female')
    op.drop_column('profiles', 'adjusted_calories_male')
    op.drop_column('profiles', 'activity_score')
    op.drop_column('profiles', 'activity_vigorous_minutes')
    op.drop_column('profiles', 'activity_moderate_minutes')
    op.drop_column('profiles', 'activity_exercise_intensity')
    op.drop_column('profiles', 'activity_daily_movement')
    # ### end Alembic commands ###