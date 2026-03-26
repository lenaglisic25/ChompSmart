from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext

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

    patients = db.query(UserModel).filter(UserModel.provider_email == email).all()
    return patients

@router.get("/list")
def list_all_providers(db: Session = Depends(get_db)):
    providers = db.query(Provider).all()
    return [{"email": p.email, "name": getattr(p, "name", p.email)} for p in providers]