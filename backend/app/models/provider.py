from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base 

class Provider(Base):
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    is_first_login = Column(Boolean, default=True)