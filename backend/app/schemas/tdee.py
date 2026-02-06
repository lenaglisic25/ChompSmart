from pydantic import BaseModel, EmailStr

class TdeeOut(BaseModel):
    user_email: EmailStr
    age_years: int
    height_cm: float
    weight_kg: float
    activity_factor: float
    bmr_male: float
    bmr_female: float
    tdee_male: float
    tdee_female: float
    macros_male: MacroResult
    macros_female: MacroResult

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
        from_attributes = True #jack - changed from orm_mode = True
