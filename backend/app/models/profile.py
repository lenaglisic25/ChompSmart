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
    weight_goal = Column(String, nullable=True)  # lose | gain | maintain | not_sure | not_say

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
    sex_at_birth = Column(String, nullable=True)
    health_conditions_other_text = Column(String, nullable=True)
    medications_text = Column(String, nullable=True)
    med_allergies_text = Column(String, nullable=True)
    cooking_skill = Column(String, nullable=True)
    weekly_grocery_budget = Column(String, nullable=True)
    food_help_other_text = Column(String, nullable=True)
    internet_access = Column(String, nullable=True)

    # Legacy activity fields (kept for backward compat)
    steps_range = Column(String, nullable=True)
    active_days_per_week = Column(String, nullable=True)

    # New 4-question activity scoring
    activity_daily_movement = Column(Integer, nullable=True)      # Q1 score (0-3)
    activity_exercise_intensity = Column(Integer, nullable=True)  # Q2 score (0-3)
    activity_moderate_minutes = Column(Integer, nullable=True)    # Q3 score (0-3)
    activity_vigorous_minutes = Column(Integer, nullable=True)    # Q4 score (0-3)
    activity_score = Column(Integer, nullable=True)               # total (0-12)

    # TDEE outputs
    calorie_goal = Column(Integer, nullable=True)
    bmr_male = Column(Float, nullable=True)
    bmr_female = Column(Float, nullable=True)
    tdee_male = Column(Float, nullable=True)
    tdee_female = Column(Float, nullable=True)
    activity_factor = Column(Float, nullable=True)

    # Adjusted calories after weight goal modifier
    adjusted_calories_male = Column(Float, nullable=True)
    adjusted_calories_female = Column(Float, nullable=True)

    # Macros
    carbs_g = Column(Float, nullable=True)
    protein_g = Column(Float, nullable=True)
    fats_g = Column(Float, nullable=True)
    fiber_g = Column(Float, nullable=True)
    carbs_pct = Column(Float, nullable=True)
    protein_pct = Column(Float, nullable=True)
    fats_pct = Column(Float, nullable=True)

    # Sodium tracking
    sodium_mg_max = Column(Integer, nullable=True)
    sodium_mg_actual = Column(Float, nullable=True)
    sodium_fda_limit = Column(Integer, nullable=True)
    sodium_difference_from_fda = Column(Float, nullable=True)
    sodium_message = Column(String, nullable=True)

    # Sugar tracking
    sugar_g_max = Column(Float, nullable=True)
    sugar_g_actual = Column(Float, nullable=True)
    sugar_limit_g = Column(Float, nullable=True)
    sugar_difference_from_limit = Column(Float, nullable=True)
    sugar_message = Column(String, nullable=True)
