from sqlalchemy import Column, Integer, String, Date
from app.database import Base

class UserModel(Base):
    __tablename__ = "users"

    email = Column(String, primary_key=True, index=True, unique=True)
    password = Column(String, nullable=False)
    name = Column(String, nullable=True) 
    provider_email = Column(String, nullable=True)

