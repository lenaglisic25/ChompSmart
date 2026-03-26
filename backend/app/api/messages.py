from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from pydantic import BaseModel
from typing import List

from app.database import get_db
from app.models.message import Message

router = APIRouter(prefix="/messages", tags=["Messages"])

class MessageCreate(BaseModel):
    patient_email: str
    provider_email: str
    sender: str
    text: str
    time: str

@router.post("/")
def send_message(msg: MessageCreate, db: Session = Depends(get_db)):
    new_message = Message(
        patient_email=msg.patient_email,
        provider_email=msg.provider_email,
        sender=msg.sender,
        text=msg.text,
        time=msg.time
    )
    db.add(new_message)
    db.commit()
    return {"status": "Message saved successfully"}

@router.get("/")
def get_messages(current_user: str, target_user: str, db: Session = Depends(get_db)):
    messages = db.query(Message).filter(
        or_(
            and_(Message.sender == current_user, Message.receiver == target_user),
            and_(Message.sender == target_user, Message.receiver == current_user)
        )
    ).order_by(Message.timestamp.asc()).all()
    
    return messages

@router.get("/{patient_email}/{provider_email}")
def get_messages(patient_email: str, provider_email: str, db: Session = Depends(get_db)):
    messages = db.query(Message).filter(
        Message.patient_email == patient_email,
        Message.provider_email == provider_email
    ).order_by(Message.id.asc()).all()
    
    return messages