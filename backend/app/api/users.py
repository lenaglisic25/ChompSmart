from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.database import get_db
from app.models.user import UserModel
from app.schemas.user import UserCreate, User as UserSchema

from pydantic import BaseModel

from app.models.provider import Provider

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserLogin(BaseModel):
    email: str
    password: str

@router.post("/login")
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    existing_user = db.query(UserModel).filter(UserModel.email == user.email).first()

    if not existing_user or not pwd_context.verify(user.password, existing_user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")

    provider_name = "My Provider"
    if existing_user.provider_email:
        provider = db.query(Provider).filter(Provider.email == existing_user.provider_email).first()
        if provider and provider.name:
            provider_name = provider.name

    return {
        "email": existing_user.email,
        "name": getattr(existing_user, "name", "Patient"), 
        "provider_email": existing_user.provider_email,
        "provider_name": provider_name,
        "userType": "patient"
    }

@router.post("/create")
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(UserModel).filter(UserModel.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists.")

    hashed_password = pwd_context.hash(user_data.password)
    
    new_user = UserModel(
        email=user_data.email, 
        password=hashed_password,
        name=user_data.name,
        provider_email=user_data.provider_email
    )
    db.add(new_user)
    db.commit()
    
    return {"message": "Account created successfully!"}

@router.get("/", response_model=list[UserSchema])
def get_users(db: Session = Depends(get_db)):
    users = db.query(UserModel).all()
    return users