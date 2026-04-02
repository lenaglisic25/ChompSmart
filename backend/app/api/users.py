import os
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.database import get_db
from app.models.user import UserModel
from app.schemas.user import UserCreate, User as UserSchema
from pydantic import BaseModel
from app.models.provider import Provider
from app.utils.mailer import send_welcome_email

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

@router.post("/register")
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    if not user_data.password or not user_data.password.strip():
        raise HTTPException(status_code=400, detail="Password is required for manual sign-up.")
    
    existing_user = db.query(UserModel).filter(UserModel.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists.")

    hashed_password = pwd_context.hash(user_data.password)
    
    new_user = UserModel(
        email=user_data.email, 
        password=hashed_password,
        name=user_data.name,
        provider_email=user_data.provider_email,
        is_verified=True,
        user_type="patient"
    )
    db.add(new_user)
    db.commit()

    try:
        await send_welcome_email(user_data.email)
    except Exception as email_err:
        print(f"Welcome email failed for {user_data.email}: {str(email_err)}")
    
    return {"message": "Account created successfully!"}

@router.post("/google-login")
async def google_login(payload: dict, db: Session = Depends(get_db)):
    token = payload.get("token")
    try:
        id_info = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(), 
            os.getenv("GOOGLE_CLIENT_ID")
        )
        email = id_info['email'].lower()
        user = db.query(UserModel).filter(UserModel.email == email).first()
        
        is_new_user = False
        
        if not user:
            is_new_user = True
            user = UserModel(
                email=email,
                name=id_info.get('name'),
                password=None,
                is_verified=True,
                user_type="patient"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            try:
                await send_welcome_email(email)
            except Exception as email_err:
                print(f"Welcome email failed for {email}: {str(email_err)}")
        
        provider_name = "My Provider"
        if user.provider_email:
            provider = db.query(Provider).filter(Provider.email == user.provider_email).first()
            if provider and provider.name:
                provider_name = provider.name
                
        return {
            "email": user.email,
            "name": user.name,
            "provider_email": user.provider_email,
            "provider_name": provider_name,
            "userType": "patient",
            "is_first_login": is_new_user
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid Google Token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")

@router.post("/create")
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    if not user_data.password or not user_data.password.strip():
        raise HTTPException(status_code=400, detail="Password is required for manual sign-up.")

    existing_user = db.query(UserModel).filter(UserModel.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists.")

    hashed_password = pwd_context.hash(user_data.password)
    
    new_user = UserModel(
        email=user_data.email, 
        password=hashed_password,
        name=user_data.name,
        provider_email=user_data.provider_email,
        is_verified=True,
        user_type="patient"
    )
    db.add(new_user)
    db.commit()
    
    return {"message": "Account created successfully!"}

@router.get("/", response_model=list[UserSchema])
def get_users(db: Session = Depends(get_db)):
    users = db.query(UserModel).all()
    return users