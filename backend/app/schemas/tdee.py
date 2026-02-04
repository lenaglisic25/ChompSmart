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

    class Config:
        from_attributes = True #jack - changed from orm_mode = True
