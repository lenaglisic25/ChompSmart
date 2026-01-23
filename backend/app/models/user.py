from sqlalchemy import Column, Integer, String, Date
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    birthday = Column(Date)
    address = Column(String)
    height = Column(String)
    weight = Column(String)
    race = Column(String)
    ethnicity = Column(String)
    gender = Column(String)
