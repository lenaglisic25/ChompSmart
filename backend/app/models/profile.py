from sqlalchemy import Column, Integer, String, JSON, ForeignKey, Float
from app.database import Base

class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True, index=True)

    user_email = Column(String, ForeignKey("users.email"), nullable=False)

    name = Column(String, nullable=True)
    birthday_text = Column(String, nullable=True)
    home_address = Column(String, nullable=True)
    height_text = Column(String, nullable=True)
    weight_text = Column(String, nullable=True)

    race = Column(JSON, nullable=True)
    health_conditions = Column(JSON, nullable=True)
    movement_types = Column(JSON, nullable=True)
    household_age_groups = Column(JSON, nullable=True)
    household_size = Column(Integer, nullable=True)
    dietary_restrictions = Column(JSON, nullable=True)
    cuisine_styles = Column(JSON, nullable=True)
    meal_types = Column(JSON, nullable=True)
    cooking_methods = Column(JSON, nullable=True)
    kitchen_equipment = Column(JSON, nullable=True)
    food_help_programs = Column(JSON, nullable=True)
    grocery_stores = Column(JSON, nullable=True)
    technology_devices = Column(JSON, nullable=True)

    race_other_text = Column(String, nullable=True)
    ethnicity = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    health_conditions_other_text = Column(String, nullable=True)
    medications_text = Column(String, nullable=True)
    med_allergies_text = Column(String, nullable=True)
    steps_range = Column(String, nullable=True)
    active_days_per_week = Column(String, nullable=True)
    cooking_skill = Column(String, nullable=True)
    weekly_grocery_budget = Column(String, nullable=True)
    food_help_other_text = Column(String, nullable=True)
    internet_access = Column(String, nullable=True)

    calorie_goal = Column(Integer, nullable=True)

    bmr_male = Column(Float, nullable=True)
    bmr_female = Column(Float, nullable=True)
    tdee_male = Column(Float, nullable=True)
    tdee_female = Column(Float, nullable=True)
    activity_factor = Column(Float, nullable=True)

