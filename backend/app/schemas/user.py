from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    email: str
    password: Optional[str] = None
    name: Optional[str] = None
    provider_email: Optional[str] = None

class User(BaseModel):
    email: EmailStr
    password: Optional[str] = None

    class Config:
        from_attributes = True #jack - changed from orm_mode = True

