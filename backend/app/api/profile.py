from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.profile import Profile
from app.schemas import profile as profile_schema
from sqlalchemy import func
from app.models.meals import Meal

#jack- added these for TDEE calculations
from app.schemas import tdee as tdee_schema
from app.services.tdee import compute_tdee
#all i added

router = APIRouter(prefix="/profile", tags=["profiles"])

@router.post("/", response_model=profile_schema.Profile)
def create_or_update_profile(profile: profile_schema.ProfileCreate, db: Session = Depends(get_db)):
    
    email = profile.user_email
    profile_data = profile.dict(exclude_unset=True)

    existing_profile = db.query(Profile).filter(Profile.user_email == email).first()

    if existing_profile:
        for key, value in profile_data.items():
            if value is not None:
                setattr(existing_profile, key, value)
        new_profile = existing_profile
    else:
        new_profile = Profile(**profile_data)
        db.add(new_profile)

    db.commit()
    db.refresh(new_profile)

    try:
        if (
            new_profile.birthday_text
            and new_profile.height_text
            and new_profile.weight_text
            and new_profile.sex_at_birth
        ):
            result = compute_tdee(
                birthday_text=new_profile.birthday_text,
                height_text=new_profile.height_text,
                weight_text=new_profile.weight_text,
                steps_range=new_profile.steps_range,
                active_days_per_week=new_profile.active_days_per_week,
            )

            new_profile.bmr_male = result.mifflin_bmr_male
            new_profile.bmr_female = result.mifflin_bmr_female
            new_profile.tdee_male = result.mifflin_tdee_male
            new_profile.tdee_female = result.mifflin_tdee_female
            new_profile.activity_factor = result.pal

            
            # set calorie goal based on gender
            #if new_profile.gender.lower() == "male":
            #    new_profile.calorie_goal = round(result.mifflin_tdee_male)
            #else:
            #    new_profile.calorie_goal = round(result.mifflin_tdee_female)

            # set calorie goal based on gender - UPDATED THIS- jack
            if new_profile.sex_at_birth.lower() == "male":
                new_profile.calorie_goal = round(result.mifflin_tdee_male)
                # Save male macros
                new_profile.carbs_g = result.macros_male.carbs_g
                new_profile.protein_g = result.macros_male.protein_g
                new_profile.fats_g = result.macros_male.fats_g
                new_profile.fiber_g = result.macros_male.fiber_g
                new_profile.carbs_pct = result.macros_male.carbs_pct
                new_profile.protein_pct = result.macros_male.protein_pct
                new_profile.fats_pct = result.macros_male.fats_pct
            else:
                new_profile.calorie_goal = round(result.mifflin_tdee_female)
                # Save female macros
                new_profile.carbs_g = result.macros_female.carbs_g
                new_profile.protein_g = result.macros_female.protein_g
                new_profile.fats_g = result.macros_female.fats_g
                new_profile.fiber_g = result.macros_female.fiber_g
                new_profile.carbs_pct = result.macros_female.carbs_pct
                new_profile.protein_pct = result.macros_female.protein_pct
                new_profile.fats_pct = result.macros_female.fats_pct

            db.commit()
            db.refresh(new_profile)

    except Exception as e:
        print("TDEE calculation failed:", e)

    return new_profile

@router.get("/", response_model=list[profile_schema.Profile])
def get_profiles(db: Session = Depends(get_db)):
    profiles = db.query(Profile).all()
    return profiles

@router.get("/{user_email}", response_model=profile_schema.Profile)
def get_profile(user_email: str, db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.user_email == user_email).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

#jack - added endpoints for tdee calculations
@router.get("/{user_email}/tdee", response_model=tdee_schema.TdeeOut)
def get_profile_tdee(user_email: str, db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.user_email == user_email).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if not profile.birthday_text or not profile.height_text or not profile.weight_text:
        raise HTTPException(
            status_code=422,
            detail="Missing required fields: birthday_text, height_text, weight_text",
        )

    try:
        result = compute_tdee(
            birthday_text=profile.birthday_text,
            height_text=profile.height_text,
            weight_text=profile.weight_text,
            steps_range=profile.steps_range,
            active_days_per_week=profile.active_days_per_week,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {
        "user_email": user_email,
        "age_years": result.age_years,
        "height_cm": round(result.height_cm, 2),
        "weight_kg": round(result.weight_kg, 2),
        # yavna - updated names to match algorithm
        "activity_factor": round(result.pal, 3),
        "bmr_male": round(result.mifflin_bmr_male),
        "bmr_female": round(result.mifflin_bmr_female),
        "tdee_male": round(result.mifflin_tdee_male),
        "tdee_female": round(result.mifflin_tdee_female),
        #jack - added these
        "macros_male": result.macros_male,
        "macros_female": result.macros_female,
    }
#all i added