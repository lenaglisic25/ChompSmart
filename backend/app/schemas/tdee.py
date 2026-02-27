from pydantic import BaseModel, EmailStr


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
    activity_factor: float
    bmr_male: float
    bmr_female: float
    tdee_male: float
    tdee_female: float
    macros_male: MacroResult
    macros_female: MacroResult

    # Sodium tracking (mg)
    sodium_mg_max: float
    sodium_mg_actual: float
    sodium_fda_limit: float
    sodium_difference_from_fda: float
    sodium_message: str

    # Sugar tracking (grams)
    sugar_g_max: float
    sugar_g_actual: float
    sugar_limit_g: float
    sugar_difference_from_limit: float
    sugar_message: str

    class Config:
        from_attributes = True