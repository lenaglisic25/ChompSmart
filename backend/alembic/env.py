import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv

# 1. Resolve project root and add to system path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# 2. Load environment variables dynamically
env_path = backend_dir / '.env'
load_dotenv(dotenv_path=env_path)

# 3. Import Base and ALL Models (Crucial to prevent accidental drops)
from app.database import Base
from app.models.user import UserModel
from app.models.provider import Provider
from app.models.profile import Profile
from app.models.meals import Meal
from app.models.message import Message
# WARNING: Ensure GroceryItem, Preference, etc. are imported if they exist in your DB
# from app.models.grocery import GroceryItem
# from app.models.preferences import Preference

# Alembic Config object
config = context.config

# 4. Override sqlalchemy.url with the .env variable safely
database_url = os.getenv('DATABASE_URL')
if database_url:
    config.set_main_option('sqlalchemy.url', database_url)

# Setup Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 5. Attach target metadata
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    url = config.get_main_option("sqlalchemy.url")
    if not url:
        raise RuntimeError("CRITICAL: sqlalchemy.url is not set. Check DATABASE_URL in backend/.env")

    # Connect using the parsed URL
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        url=url,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            render_as_batch=True  # Required for SQLite column drops/alters
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()