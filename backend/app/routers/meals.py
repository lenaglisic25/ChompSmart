from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from app.database import get_db
from app.models.meals import Meal

router = APIRouter(prefix="/meals", tags=["meals"])

@router.post("/log")
def log_meal(meal: dict, db: Session = Depends(get_db)):

    meal_data = {
        "user_email": meal.get("user_email"),
        "meal_type": meal.get("meal_type"),
        "food_name": meal.get("food_name"),
        "calories": meal.get("calories", 0),
        "protein": meal.get("protein", 0),
        "carbs": meal.get("carbs", 0),
        "fats": meal.get("fats", 0),
        "fiber": meal.get("fiber", 0),
        "sodium": meal.get("sodium", 0),
    }

    m = Meal(**meal_data)
    db.add(m)
    db.commit()
    db.refresh(m) 
    return {"ok": True, "id": m.id} 

@router.get("/log")
def get_meals(db: Session = Depends(get_db)):
    return db.query(Meal).all()

@router.get("/today")
def get_today_meals(user_email: str, db: Session = Depends(get_db)):
    today = date.today()
    meals = db.query(Meal).filter(
        Meal.user_email == user_email,
        func.date(Meal.created_at) == today
    ).all()
    return meals

@router.delete("/reset")
def reset_daily_log(user_email: str, db: Session = Depends(get_db)):
    db.query(Meal).filter(Meal.user_email == user_email).delete()
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