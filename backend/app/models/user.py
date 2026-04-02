from sqlalchemy import Boolean, Column, Integer, String, Date
from app.database import Base

class UserModel(Base):
    __tablename__ = "users"

    email = Column(String, primary_key=True, index=True, unique=True)
    password = Column(String, nullable=True)
    name = Column(String, nullable=True) 
    provider_email = Column(String, nullable=True)

    is_verified = Column(Boolean, default=False)
    user_type = Column(String, default="patient")