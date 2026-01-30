from sqlalchemy import Column, String
from app.database import Base

class Preferences(Base):
    __tablename__ = "preferences"

    user_email = Column(String, primary_key=True, index=True)
    dietary_restrictions = Column(String)
    cuisines = Column(String)
    meal_types = Column(String)
    cooking_skills = Column(String)
    cooking_methods = Column(String)
    kitchen_equipment = Column(String)
    weekly_budget = Column(String)
    food_programs = Column(String)
    grocery_locations = Column(String)
    internet_access = Column(String)
    tech_devices = Column(String)
