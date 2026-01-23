from sqlalchemy import Column, Integer, String, ForeignKey
from app.database import Base

class HealthProfile(Base):
    __tablename__ = "health_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))

    health_conditions = Column(String)
    medications = Column(String)
    medication_allergies = Column(String)

    steps_per_day = Column(String)
    active_days_per_week = Column(String)
    movement_types = Column(String)
