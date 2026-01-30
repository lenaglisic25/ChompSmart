from pydantic import BaseModel
from typing import Optional

class PreferencesBase(BaseModel):
    user_email: str

class PreferencesCreate(PreferencesBase):
    dietary_restrictions: Optional[str]
    cuisines: Optional[str]
    meal_types: Optional[str]
    cooking_skills: Optional[str]
    cooking_methods: Optional[str]
    kitchen_equipment: Optional[str]
    weekly_budget: Optional[str]
    food_programs: Optional[str]
    grocery_locations: Optional[str]
    internet_access: Optional[str]
    tech_devices: Optional[str]

class Preferences(PreferencesBase):
    class Config:
        orm_mode = True