from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    provider_email: str

class User(BaseModel):
    email: EmailStr
    password: str

    class Config:
        from_attributes = True #jack - changed from orm_mode = True

