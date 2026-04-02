from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False)  # "engagement" or "nutrition"
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, ForeignKey("users.email"), nullable=False, index=True)
    badge_name = Column(String, ForeignKey("badges.name"), nullable=False)
    earned_at = Column(DateTime(timezone=True), server_default=func.now())
    notified = Column(Boolean, default=False)  # frontend can use this to show a popup once

    __table_args__ = (
        UniqueConstraint("user_email", "badge_name", name="unique_user_badge"),
    )