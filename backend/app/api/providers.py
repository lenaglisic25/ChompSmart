import os
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.meals import Meal
from app.models.profile import Profile
from app.models.provider import Provider
from app.models.user import UserModel
from app.schemas.provider import ProviderLogin, PasswordUpdate

router = APIRouter(prefix="/providers", tags=["Providers"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_DUMMY_HASH: str = pwd_context.hash("__dummy_password_never_matches__")

JWT_SECRET: str = os.environ["SECRET_KEY"]
JWT_ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = 30


def _create_access_token(email: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": email, "role": role, "exp": expire},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def _set_auth_cookie(response: Response, email: str, role: str) -> None:
    token = _create_access_token(email, role)
    is_production = os.getenv("ENV") == "production"
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def get_current_provider(access_token: str = Cookie(None)) -> dict:
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    try:
        payload = jwt.decode(access_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if not email or not role:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")
    if role != "provider":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Providers only.")
    return {"email": email, "role": role}

def _date_str(value) -> str:
    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m-%d")
    return str(value)[:10]


def _build_streak(meals_by_date: dict, today: date) -> int:
    streak = 0
    current = today
    if today.strftime("%Y-%m-%d") not in meals_by_date:
        current -= timedelta(days=1)
    while current.strftime("%Y-%m-%d") in meals_by_date:
        streak += 1
        current -= timedelta(days=1)
    return streak

@router.post("/login")
def login_provider(credentials: ProviderLogin, response: Response, db: Session = Depends(get_db)):
    provider = db.query(Provider).filter(Provider.email == credentials.email.lower().strip()).first()

    hash_to_check = provider.password if (provider and provider.password) else _DUMMY_HASH
    password_valid = pwd_context.verify(credentials.password, hash_to_check)

    if not provider or not password_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    _set_auth_cookie(response, provider.email, "provider")

    return {
        "email": provider.email,
        "name": getattr(provider, "name", "Provider"),
        "userType": "provider",
        "is_first_login": getattr(provider, "is_first_login", True),
    }


@router.post("/logout")
def logout(response: Response):
    is_production = os.getenv("ENV") == "production"
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=is_production,
        samesite="lax"
    )
    return {"message": "Logged out"}


@router.post("/change-password")
def change_password(
    data: PasswordUpdate,
    db: Session = Depends(get_db),
    current_provider: dict = Depends(get_current_provider),
):
    if not data.new_password or len(data.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters.")

    provider = db.query(Provider).filter(Provider.email == current_provider["email"]).first()
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found.")

    provider.password = pwd_context.hash(data.new_password)
    provider.is_first_login = False
    db.commit()
    return {"message": "Password updated successfully."}


@router.get("/patients")
def get_provider_patients(
    db: Session = Depends(get_db),
    current_provider: dict = Depends(get_current_provider),
):
    provider_email = current_provider["email"]
    patients = db.query(UserModel).filter(UserModel.provider_email == provider_email).all()

    today = date.today()
    thirty_days_ago = today - timedelta(days=30)
    result = []

    for patient in patients:
        profile = db.query(Profile).filter(Profile.user_email == patient.email).first()
        recent_meals = (
            db.query(Meal)
            .filter(Meal.user_email == patient.email, Meal.created_at >= thirty_days_ago)
            .all()
        )

        meals_by_date: dict[str, int] = {}
        for m in recent_meals:
            d = _date_str(m.created_at)
            meals_by_date[d] = meals_by_date.get(d, 0) + 1

        days_logged = len(meals_by_date)
        total_meals = sum(meals_by_date.values())

        result.append({
            "email": patient.email,
            "name": patient.name,
            "profile": profile,
            "adherence": {
                "daysLoggedPercent": round((days_logged / 30.0) * 100) if days_logged else 0,
                "avgMealsPerDay": round(total_meals / 30.0, 1) if total_meals else 0.0,
                "loggingConsistency": sum(1 for c in meals_by_date.values() if c >= 2),
                "biometricsAdherence": 0,
            },
            "progress": {
                "streakDays": _build_streak(meals_by_date, today),
                "goalCompletionPercent": 0,
                "weightChangePercent": 0,
                "sodiumDaysUnderLimit": 0,
            },
        })

    return result


@router.get("/me")
def get_provider_profile(
    db: Session = Depends(get_db),
    current_provider: dict = Depends(get_current_provider),
):
    provider = db.query(Provider).filter(Provider.email == current_provider["email"]).first()
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found.")
    return {"email": provider.email, "name": getattr(provider, "name", provider.email)}


@router.get("/list")
def list_all_providers(db: Session = Depends(get_db)):
    providers = db.query(Provider).all()
    return [{"email": p.email, "name": getattr(p, "name", p.email)} for p in providers]