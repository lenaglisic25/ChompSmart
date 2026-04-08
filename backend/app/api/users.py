import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.provider import Provider
from app.models.user import UserModel
from app.schemas.user import UserCreate, User as UserSchema
from app.utils.mailer import send_welcome_email

router = APIRouter(prefix="/users", tags=["users"])

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
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=os.getenv("ENV") != "dev",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def get_current_user(access_token: str = Cookie(None)) -> dict:
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    try:
        payload = jwt.decode(access_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if not email or not role:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        return {"email": email, "role": role}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")


def require_patient(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "patient":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patients only.")
    return current_user

class UserLogin(BaseModel):
    email: str
    password: str


class GoogleLoginPayload(BaseModel):
    token: str

@router.post("/login")
def login_user(user: UserLogin, response: Response, db: Session = Depends(get_db)):
    existing_user = db.query(UserModel).filter(UserModel.email == user.email.lower().strip()).first()

    hash_to_check = existing_user.password if (existing_user and existing_user.password) else _DUMMY_HASH
    password_valid = pwd_context.verify(user.password, hash_to_check)

    if not existing_user or not password_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")

    provider_name = "My Provider"
    if existing_user.provider_email:
        provider = db.query(Provider).filter(Provider.email == existing_user.provider_email).first()
        if provider and provider.name:
            provider_name = provider.name

    _set_auth_cookie(response, existing_user.email, "patient")

    return {
        "email": existing_user.email,
        "userType": "patient",
        "is_first_login": False,
        "provider_email": existing_user.provider_email,
        "provider_name": provider_name,
    }


@router.post("/google-login")
async def google_login(payload: GoogleLoginPayload, response: Response, db: Session = Depends(get_db)):
    try:
        id_info = id_token.verify_oauth2_token(
            payload.token,
            google_requests.Request(),
            os.environ["GOOGLE_CLIENT_ID"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid Google token: {exc}")

    email: str = id_info["email"].lower().strip()
    is_new_user = False

    user = db.query(UserModel).filter(UserModel.email == email).first()
    if not user:
        is_new_user = True
        user = UserModel(
            email=email,
            name=id_info.get("name"),
            password=None,
            is_verified=True,
            user_type="patient",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        try:
            await send_welcome_email(email)
        except Exception as exc:
            print(f"[mailer] Welcome email failed for {email}: {exc}")

    provider_name = "My Provider"
    if user.provider_email:
        provider = db.query(Provider).filter(Provider.email == user.provider_email).first()
        if provider and provider.name:
            provider_name = provider.name

    _set_auth_cookie(response, user.email, "patient")

    return {
        "email": user.email,
        "userType": "patient",
        "is_first_login": is_new_user,
        "provider_email": user.provider_email,
        "provider_name": provider_name,
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    if not user_data.password or not user_data.password.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is required.")
    email = user_data.email.lower().strip()
    if db.query(UserModel).filter(UserModel.email == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with that email already exists.")
    db.add(UserModel(
        email=email,
        password=pwd_context.hash(user_data.password),
        name=user_data.name,
        provider_email=user_data.provider_email,
        is_verified=True,
        user_type="patient",
    ))
    db.commit()
    try:
        await send_welcome_email(email)
    except Exception as exc:
        print(f"[mailer] Welcome email failed for {email}: {exc}")
    return {"message": "Account created successfully."}


@router.post("/create")
async def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    if not user_data.password or not user_data.password.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is required.")
    email = user_data.email.lower().strip()
    if db.query(UserModel).filter(UserModel.email == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with that email already exists.")
    db.add(UserModel(
        email=email,
        password=pwd_context.hash(user_data.password),
        name=user_data.name,
        provider_email=user_data.provider_email,
        is_verified=True,
        user_type="patient",
    ))
    db.commit()
    return {"message": "Account created successfully."}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=os.getenv("ENV") != "dev",
        samesite="strict"
    )
    return {"message": "Logged out"}


@router.get("/me", response_model=UserSchema)
def get_current_user_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_patient),
):
    user = db.query(UserModel).filter(UserModel.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user