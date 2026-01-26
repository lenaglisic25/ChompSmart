from sqlalchemy import Column, Integer, String, ForeignKey
from app.database import Base

class FoodPreferences(Base):
    __tablename__ = "food_preferences"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))

    dietary_restrictions = Column(String)
    cuisine_styles = Column(String)
    preferred_meal_types = Column(String)
