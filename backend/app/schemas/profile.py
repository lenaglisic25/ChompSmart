from pydantic import BaseModel, EmailStr
from typing import Optional, List


class ProfileCreate(BaseModel):
    user_email: EmailStr
    name: Optional[str] = None
    birthday_text: Optional[str] = None
    home_address: Optional[str] = None
    height_text: Optional[str] = None
    weight_text: Optional[str] = None
    weight_goal: Optional[str] = None  # lose | gain | maintain | not_sure | not_say
    race: Optional[List[str]] = None
    race_other_text: Optional[str] = None
    ethnicity: Optional[str] = None
    sex_at_birth: Optional[str] = None
    health_conditions: Optional[List[str]] = None
    health_conditions_other_text: Optional[str] = None
    medications_text: Optional[str] = None
    med_allergies_text: Optional[str] = None

    # --- New 4-question activity scoring (each 0-3) ---
    activity_daily_movement: Optional[int] = None       # Q1: how much do you move during the day?
    activity_exercise_intensity: Optional[int] = None   # Q2: how much do you exercise on most days?
    activity_moderate_minutes: Optional[int] = None     # Q3: moderate exercise minutes/week
    activity_vigorous_minutes: Optional[int] = None     # Q4: vigorous exercise minutes/week
    activity_score: Optional[int] = None                # total score (0-12), computed from above

    # Legacy field names (backward compatibility)
    day_movement: Optional[int] = None
    daily_exercise: Optional[int] = None
    moderate_minutes_weekly: Optional[int] = None
    vigorous_minutes_weekly: Optional[int] = None

    # Legacy fields kept for backward compatibility
    steps_range: Optional[str] = None
    active_days_per_week: Optional[str] = None

    movement_types: Optional[List[str]] = None
    household_size: Optional[int] = None
    household_age_groups: Optional[List[str]] = None
    dietary_restrictions: Optional[List[str]] = None
    cuisine_styles: Optional[List[str]] = None
    meal_types: Optional[List[str]] = None
    cooking_skill: Optional[str] = None
    cooking_methods: Optional[List[str]] = None
    kitchen_equipment: Optional[List[str]] = None
    weekly_grocery_budget: Optional[str] = None
    food_help_programs: Optional[List[str]] = None
    food_help_other_text: Optional[str] = None
    grocery_stores: Optional[List[str]] = None
    internet_access: Optional[str] = None
    technology_devices: Optional[List[str]] = None

    next_appointment: Optional[str] = None
    provider_notes: Optional[str] = None
    barriers: Optional[List[str]] = None


class Profile(ProfileCreate):
    id: Optional[int] = None

    # TDEE outputs
    calorie_goal: Optional[int] = None
    bmr_male: Optional[float] = None
    bmr_female: Optional[float] = None
    tdee_male: Optional[float] = None
    tdee_female: Optional[float] = None
    activity_factor: Optional[float] = None

    # Adjusted calories after weight goal modifier
    adjusted_calories_male: Optional[float] = None
    adjusted_calories_female: Optional[float] = None

    # Macros
    carbs_g: Optional[float] = None
    protein_g: Optional[float] = None
    fats_g: Optional[float] = None
    fiber_g: Optional[float] = None
    carbs_pct: Optional[float] = None
    protein_pct: Optional[float] = None
    fats_pct: Optional[float] = None
    calories: float = 0
    protein: float = 0
    fats: float = 0
    carbs: float = 0

    class Config:
        from_attributes = True


class MacroResult(BaseModel):
    calories: float
    carbs_g: float
    protein_g: float
    fats_g: float
    fiber_g: float
    carbs_pct: float
    protein_pct: float
    fats_pct: float

    class Config:
        from_attributes = True


class TdeeOut(BaseModel):
    user_email: EmailStr
    age_years: int
    height_cm: float
    weight_kg: float
    activity_score: int
    activity_factor: float
    pal_category: str
    bmr_male: float
    bmr_female: float
    tdee_male: float
    tdee_female: float

    # Weight goal adjusted calories
    weight_goal: str
    adjusted_calories_male: float
    adjusted_calories_female: float

    macros_male: MacroResult
    macros_female: MacroResult

    # Sodium tracking (mg)
    sodium_mg_max: float
    sodium_mg_actual: float
    sodium_fda_limit: float
    sodium_difference_from_fda: float
    sodium_message: str

    # Sugar tracking (grams)
    sugar_g_max: Optional[float] = None
    sugar_g_actual: Optional[float] = None
    sugar_limit_g: Optional[float] = None
    sugar_difference_from_limit: Optional[float] = None
    sugar_message: Optional[str] = None

    class Config:
        from_attributes = True
