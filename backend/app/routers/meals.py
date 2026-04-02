from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from app.database import get_db
from app.models.meals import Meal
from app.services.badge_service import evaluate_badges_after_meal_log
router = APIRouter(prefix="/meals", tags=["meals"])


@router.post("/log")
def log_meal(meal: dict, db: Session = Depends(get_db)):
    # Normalize sodium keys, default to 0 if missing or None
    sodium_val = meal.get("sodium")
    if sodium_val is None:
        sodium_val = meal.get("sodium_mg")
    if sodium_val is None:
        sodium_val = 0
    meal["sodium"] = float(sodium_val)

    # Normalize fiber keys, default to 0 if missing or None
    fiber_val = meal.get("fiber")
    if fiber_val is None:
        fiber_val = meal.get("fiber_g")
    if fiber_val is None:
        fiber_val = 0
    meal["fiber"] = float(fiber_val)

    # Normalize sugar keys, default to 0 if missing or None
    sugar_val = meal.get("sugar")
    if sugar_val is None:
        sugar_val = meal.get("sugars")
    if sugar_val is None:
        sugar_val = meal.get("sugars_g")
    if sugar_val is None:
        sugar_val = 0
    meal["sugar"] = float(sugar_val)

    created_at_str = meal.get("created_at")
    if created_at_str:
        meal["created_at"] = datetime.strptime(created_at_str, "%Y-%m-%d %H:%M:%S")

    m = Meal(**meal)
    db.add(m)
    db.commit()
    db.refresh(m)
    evaluate_badges_after_meal_log(m.user_email, db)
    return {"ok": True, "id": m.id}


@router.get("/log")
def get_meals(db: Session = Depends(get_db)):
    return db.query(Meal).all()


@router.get("/today")
def get_today_meals(user_email: str, db: Session = Depends(get_db)):
    meals = db.query(Meal).filter(
        Meal.user_email == user_email,
        func.date(Meal.created_at, "localtime") == date.today(),
    ).all()
    return meals


@router.delete("/reset")
def reset_daily_log(user_email: str, target_date: str, db: Session = Depends(get_db)):
    db.query(Meal).filter(
        Meal.user_email == user_email,
        func.date(Meal.created_at) == target_date
    ).delete(synchronize_session=False)
    
    db.commit()
    return {"ok": True}

@router.delete("/{meal_id}")
def delete_meal(meal_id: int, db: Session = Depends(get_db)):
    meal = db.query(Meal).filter(Meal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    db.delete(meal)
    db.commit()
    return {"ok": True}

@router.get("/daily/{user_email}")
def get_daily_log(user_email: str, target_date: str, db: Session = Depends(get_db)):
    meals = db.query(Meal).filter(
        Meal.user_email == user_email,
        func.date(Meal.created_at, "localtime") == target_date
    ).all()
    return meals