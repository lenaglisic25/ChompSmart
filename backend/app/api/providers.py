from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.models.provider import Provider
from app.schemas.provider import ProviderLogin, ProviderResponse, PasswordUpdate
from app.database import get_db

router = APIRouter(prefix="/providers", tags=["Providers"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/login", response_model=ProviderResponse)
def login_provider(credentials: ProviderLogin, db: Session = Depends(get_db)):
    provider = db.query(Provider).filter(Provider.email == credentials.email).first()

    if not provider or not pwd_context.verify(credentials.password, provider.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    return provider

@router.post("/change-password")
def change_password(data: PasswordUpdate, db: Session = Depends(get_db)):
    provider = db.query(Provider).filter(Provider.email == data.email).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    provider.password = pwd_context.hash(data.new_password)
    provider.is_first_login = False
    
    db.commit()
    return {"message": "Password updated successfully"}