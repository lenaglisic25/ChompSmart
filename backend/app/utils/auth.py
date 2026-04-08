import os
from datetime import datetime, timedelta
from fastapi import Cookie, HTTPException
from fastapi.responses import Response
from jose import jwt, JWTError

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(email: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": email, "role": role, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM
    )

is_production = os.getenv("ENV") == "production"

def set_auth_cookie(response: Response, email: str, role: str):
    token = create_access_token(email, role)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

def get_current_user(access_token: str = Cookie(None)) -> dict:
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        role = payload.get("role")
        if not email or not role:
            raise HTTPException(status_code=401)
        return {"email": email, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def require_role(role: str):
    def checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] != role:
            raise HTTPException(status_code=403, detail="Forbidden")
        return current_user
    return checker