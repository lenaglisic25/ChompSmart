from pydantic import BaseModel, EmailStr
from typing import Optional, List

class ProfileCreate(BaseModel):
    user_email: EmailStr
    name: Optional[str] = None
    birthday_text: Optional[str] = None
    home_address: Optional[str] = None
    height_text: Optional[str] = None
    weight_text: Optional[str] = None
    race: Optional[List[str]] = None
    race_other_text: Optional[str] = None
    ethnicity: Optional[str] = None
    sex_at_birth: Optional[str] = None
    health_conditions: Optional[List[str]] = None
    health_conditions_other_text: Optional[str] = None
    medications_text: Optional[str] = None
    med_allergies_text: Optional[str] = None
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



class Profile(ProfileCreate):
    id: Optional[int] = None

    # for tdee
    calorie_goal: Optional[int] = None
    bmr_male: Optional[float] = None
    bmr_female: Optional[float] = None
    tdee_male: Optional[float] = None
    tdee_female: Optional[float] = None
    activity_factor: Optional[float] = None

    # for macros - jack
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
        from_attributes = True #jack - changed from orm_mode = True
