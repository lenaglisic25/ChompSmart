from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    email: EmailStr
    password: str

    class Config:
        from_attributes = True #jack - changed from orm_mode = True

