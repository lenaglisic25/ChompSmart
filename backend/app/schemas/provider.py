from pydantic import BaseModel, EmailStr

class ProviderLogin(BaseModel):
    email: EmailStr
    password: str

class ProviderResponse(BaseModel):
    id: int
    email: EmailStr
    is_first_login: bool

    class Config:
        from_attributes = True

class PasswordUpdate(BaseModel):
    new_password: str