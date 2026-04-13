from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Meal(Base):
    __tablename__ = "meals"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True)
    meal_type = Column(String)
    food_name = Column(String)
    
    calories = Column(Float)
    protein = Column(Float)
    carbs = Column(Float)
    fats = Column(Float)
    fiber  = Column(Float, nullable=True, default=0.0)
    sodium = Column(Float, nullable=True, default=0.0)
    sugar  = Column(Float, nullable=True, default=0.0)
    total_sugar = Column(Float, nullable=True, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())