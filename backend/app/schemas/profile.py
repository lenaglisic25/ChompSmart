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
    gender: Optional[str] = None
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
    
    class Config:
        orm_mode = True
