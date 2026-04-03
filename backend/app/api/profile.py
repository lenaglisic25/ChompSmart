from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.profile import Profile
from app.schemas import profile as profile_schema
from sqlalchemy import func
from app.models.meals import Meal
from datetime import date

from app.schemas import tdee as tdee_schema
from app.services.tdee import compute_tdee

router = APIRouter(prefix="/profile", tags=["profiles"])


@router.post("/", response_model=profile_schema.Profile)
def create_or_update_profile(profile: profile_schema.ProfileCreate, db: Session = Depends(get_db)):
    email = profile.user_email
    profile_data = profile.dict(exclude_unset=True)
    
    # Map old field names to new ones for backward compatibility
    if "day_movement" in profile_data and profile_data["day_movement"] is not None:
        profile_data["activity_daily_movement"] = profile_data["day_movement"]
    if "daily_exercise" in profile_data and profile_data["daily_exercise"] is not None:
        profile_data["activity_exercise_intensity"] = profile_data["daily_exercise"]
    if "moderate_minutes_weekly" in profile_data and profile_data["moderate_minutes_weekly"] is not None:
        profile_data["activity_moderate_minutes"] = profile_data["moderate_minutes_weekly"]
    if "vigorous_minutes_weekly" in profile_data and profile_data["vigorous_minutes_weekly"] is not None:
        profile_data["activity_vigorous_minutes"] = profile_data["vigorous_minutes_weekly"]
    
    # Remove old field names from payload before saving
    profile_data.pop("day_movement", None)
    profile_data.pop("daily_exercise", None)
    profile_data.pop("moderate_minutes_weekly", None)
    profile_data.pop("vigorous_minutes_weekly", None)

    existing_profile = db.query(Profile).filter(Profile.user_email == email).first()

    if existing_profile:
        for key, value in profile_data.items():
            if hasattr(existing_profile, key):
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
            # Get today's meals for sodium calculation
            today = date.today()
            today_meals = db.query(Meal).filter(
                Meal.user_email == email,
                func.date(Meal.created_at) == today
            ).all()

            result = compute_tdee(
                birthday_text=new_profile.birthday_text,
                height_text=new_profile.height_text,
                weight_text=new_profile.weight_text,
                # New 4-question activity scoring
                daily_movement=new_profile.activity_daily_movement,
                exercise_intensity=new_profile.activity_exercise_intensity,
                moderate_minutes_weekly=new_profile.activity_moderate_minutes,
                vigorous_minutes_weekly=new_profile.activity_vigorous_minutes,
                # Weight goal modifier
                weight_goal=new_profile.weight_goal,
                # Legacy fallback
                steps_range=new_profile.steps_range,
                active_days_per_week=new_profile.active_days_per_week,
            )

            # Save TDEE outputs
            new_profile.bmr_male = result.mifflin_bmr_male
            new_profile.bmr_female = result.mifflin_bmr_female
            new_profile.tdee_male = result.mifflin_tdee_male
            new_profile.tdee_female = result.mifflin_tdee_female
            new_profile.activity_factor = result.pal

            # Set calorie goal and macros based on sex
            # Note: target_calories already includes weight goal adjustments from compute_tdee
            sex = (new_profile.sex_at_birth or "").lower()
            if sex in ["male", "m"]:
                new_profile.calorie_goal = round(result.target_calories_male)
                new_profile.carbs_g = result.macros_male.carbs_g
                new_profile.protein_g = result.macros_male.protein_g
                new_profile.fats_g = result.macros_male.fats_g
                new_profile.fiber_g = result.macros_male.fiber_g
                new_profile.carbs_pct = result.macros_male.carbs_pct
                new_profile.protein_pct = result.macros_male.protein_pct
                new_profile.fats_pct = result.macros_male.fats_pct
            else:
                new_profile.calorie_goal = round(result.target_calories_female)
                new_profile.carbs_g = result.macros_female.carbs_g
                new_profile.protein_g = result.macros_female.protein_g
                new_profile.fats_g = result.macros_female.fats_g
                new_profile.fiber_g = result.macros_female.fiber_g
                new_profile.carbs_pct = result.macros_female.carbs_pct
                new_profile.protein_pct = result.macros_female.protein_pct
                new_profile.fats_pct = result.macros_female.fats_pct

            db.commit()
            db.refresh(new_profile)
        else:
            print(f"Missing required fields: birthday_text={new_profile.birthday_text}, height_text={new_profile.height_text}, weight_text={new_profile.weight_text}, sex_at_birth={new_profile.sex_at_birth}")

    except Exception as e:
        print(f"TDEE calculation failed for {email}: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

    return new_profile


@router.get("/", response_model=list[profile_schema.Profile])
def get_profiles(db: Session = Depends(get_db)):
    return db.query(Profile).all()


@router.get("/{user_email}", response_model=profile_schema.Profile)
def get_profile(user_email: str, db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.user_email == user_email).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


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
            weight_goal=profile.weight_goal,
            # New 4-question activity scoring
            daily_movement=profile.activity_daily_movement,
            exercise_intensity=profile.activity_exercise_intensity,
            moderate_minutes_weekly=profile.activity_moderate_minutes,
            vigorous_minutes_weekly=profile.activity_vigorous_minutes,
            # Legacy fallback
            steps_range=profile.steps_range,
            active_days_per_week=profile.active_days_per_week,
        )

        # Sodium totals from today's meals
        sodium_mg_actual = float(
            db.query(func.coalesce(func.sum(Meal.sodium), 0))
            .filter(
                Meal.user_email == user_email,
                func.date(Meal.created_at, "localtime") == date.today()
            )
            .scalar() or 0
        )
        sodium_fda_limit = 2300
        sodium_mg_max = sodium_fda_limit
        sodium_difference_from_fda = sodium_mg_max - sodium_mg_actual
        sodium_message = (
            f"On track, {sodium_difference_from_fda:.0f} mg remaining today."
            if sodium_mg_actual <= sodium_fda_limit
            else f"Over limit by {abs(sodium_difference_from_fda):.0f} mg today."
        )

        # Sugar totals from today's meals
        sugar_g_actual = float(
            db.query(func.coalesce(func.sum(Meal.sugar), 0))
            .filter(
                Meal.user_email == user_email,
                func.date(Meal.created_at, "localtime") == date.today()
            )
            .scalar() or 0
        )
        sugar_limit_g = 50.0
        sugar_g_max = sugar_limit_g
        sugar_difference_from_limit = sugar_g_max - sugar_g_actual
        sugar_message = (
            f"On track, {sugar_difference_from_limit:.1f} g remaining today."
            if sugar_g_actual <= sugar_limit_g
            else f"Over limit by {abs(sugar_difference_from_limit):.1f} g today."
        )

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {
        "user_email": user_email,
        "age_years": result.age_years,
        "height_cm": round(result.height_cm, 2),
        "weight_kg": round(result.weight_kg, 2),
        "activity_factor": round(result.pal, 3),
        "pal_category": result.pal_category,
        "bmr_male": round(result.mifflin_bmr_male),
        "bmr_female": round(result.mifflin_bmr_female),
        "tdee_male": round(result.mifflin_tdee_male),
        "tdee_female": round(result.mifflin_tdee_female),
        "weight_goal": profile.weight_goal,
        "target_calories_male": round(result.target_calories_male),
        "target_calories_female": round(result.target_calories_female),
        "macros_male": result.macros_male,
        "macros_female": result.macros_female,
        "sodium_mg_max": sodium_mg_max,
        "sodium_mg_actual": sodium_mg_actual,
        "sodium_fda_limit": sodium_fda_limit,
        "sodium_difference_from_fda": sodium_difference_from_fda,
        "sodium_message": sodium_message,
        "sugar_g_max": sugar_g_max,
        "sugar_g_actual": sugar_g_actual,
        "sugar_limit_g": sugar_limit_g,
        "sugar_difference_from_limit": sugar_difference_from_limit,
        "sugar_message": sugar_message,
    }