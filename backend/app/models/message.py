from sqlalchemy import Column, Integer, String
from app.database import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    patient_email = Column(String, index=True)
    provider_email = Column(String, index=True)
    sender = Column(String)
    text = Column(String)
    time = Column(String)