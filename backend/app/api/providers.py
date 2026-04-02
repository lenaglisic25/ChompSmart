from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import date, timedelta
from app.models.user import UserModel
from app.models.provider import Provider
from app.schemas.provider import ProviderLogin, PasswordUpdate
from app.database import get_db

router = APIRouter(prefix="/providers", tags=["Providers"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/login")
def login_provider(credentials: ProviderLogin, db: Session = Depends(get_db)):
    provider = db.query(Provider).filter(Provider.email == credentials.email).first()

    if not provider or not pwd_context.verify(credentials.password, provider.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    return {
        "email": provider.email,
        "name": getattr(provider, "name", "Provider"),
        "is_first_login": getattr(provider, "is_first_login", True),
        "userType": "provider"
    }

@router.post("/change-password")
def change_password(data: PasswordUpdate, db: Session = Depends(get_db)):
    provider = db.query(Provider).filter(Provider.email == data.email).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    provider.password = pwd_context.hash(data.new_password)
    provider.is_first_login = False
    
    db.commit()
    return {"message": "Password updated successfully"}

@router.get("/patients")
def get_provider_patients(email: str, db: Session = Depends(get_db)):
    is_provider = db.query(Provider).filter(Provider.email == email).first()
    
    if not is_provider:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied: Unauthorized access."
        )

    from app.models.profile import Profile
    from app.models.meals import Meal
    
    patients = db.query(UserModel).outerjoin(Profile, UserModel.email == Profile.user_email).filter(UserModel.provider_email == email).all()
    
    today = date.today()
    thirty_days_ago = today - timedelta(days=30)
    
    result = []
    for patient in patients:
        profile = db.query(Profile).filter(Profile.user_email == patient.email).first()
        
        # 1. CHANGE 'Meal.date' to 'Meal.created_at' (or your actual column name)
        recent_meals = db.query(Meal).filter(
            Meal.user_email == patient.email,
            Meal.created_at >= thirty_days_ago 
        ).all()
        
        meals_by_date = {}
        for m in recent_meals:
            # 2. CHANGE 'm.date' to 'm.created_at' here as well
            # We slice [:10] just in case it's a string like '2026-04-02T15:30:00' to only get the YYYY-MM-DD
            d_str = m.created_at.strftime('%Y-%m-%d') if hasattr(m.created_at, 'strftime') else str(m.created_at)[:10]
            meals_by_date[d_str] = meals_by_date.get(d_str, 0) + 1
            
        days_logged = len(meals_by_date)
        days_logged_percent = round((days_logged / 30.0) * 100) if days_logged > 0 else 0
        total_meals = sum(meals_by_date.values())
        avg_meals_per_day = round(total_meals / 30.0, 1) if total_meals > 0 else 0.0
        logging_consistency = sum(1 for count in meals_by_date.values() if count >= 2)
        
        streak = 0
        current_date = today
        while True:
            d_str = current_date.strftime('%Y-%m-%d')
            if d_str in meals_by_date:
                streak += 1
                current_date -= timedelta(days=1)
            else:
                if current_date == today:
                    current_date -= timedelta(days=1)
                    d_str = current_date.strftime('%Y-%m-%d')
                    if d_str in meals_by_date:
                        streak += 1
                        current_date -= timedelta(days=1)
                        continue
                break
                
        patient_data = {
            "email": patient.email,
            "name": patient.name,
            "profile": profile,
            "adherence": {
                "daysLoggedPercent": days_logged_percent,
                "avgMealsPerDay": avg_meals_per_day,
                "loggingConsistency": logging_consistency,
                "biometricsAdherence": 0
            },
            "progress": {
                "streakDays": streak,
                "goalCompletionPercent": 0,
                "weightChangePercent": 0,
                "sodiumDaysUnderLimit": 0
            }
        }
        result.append(patient_data)
    
    return result

@router.get("/list")
def list_all_providers(db: Session = Depends(get_db)):
    providers = db.query(Provider).all()
    return [{"email": p.email, "name": getattr(p, "name", p.email)} for p in providers]