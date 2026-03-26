from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base 

class Provider(Base):
    __tablename__ = "providers"

    email = Column(String, primary_key=True, index=True, unique=True)
    password = Column(String, nullable=False)
    name = Column(String, nullable=True)
    is_first_login = Column(Boolean, default=True)