from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    name: str
    birthday: str
    address: str
    height: str
    weight: str
    race: Optional[str] = None
    ethnicity: Optional[str] = None
    gender: Optional[str] = None

class UserCreate(UserBase):
    pass 

class User(UserBase):
    id: int

    class Config:
        orm_mode = True

