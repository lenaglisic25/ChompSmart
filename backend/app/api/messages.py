from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.message import Message
from app.models.user import UserModel
from app.models.provider import Provider
from app.utils.auth import get_current_user

router = APIRouter(prefix="/messages", tags=["Messages"])

MAX_MESSAGE_LENGTH = 2000


class MessageCreate(BaseModel):
    provider_email: str | None = None
    patient_email: str | None = None
    text: str
    time: str


@router.get("/")
def get_messages(
    provider_email: str | None = None,
    patient_email: str | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] == "patient":
        if not provider_email:
            raise HTTPException(status_code=400, detail="provider_email is required.")

        patient = db.query(UserModel).filter(UserModel.email == current_user["email"]).first()
        if not patient or patient.provider_email != provider_email:
            raise HTTPException(status_code=403, detail="You are not assigned to this provider.")

        messages = (
            db.query(Message)
            .filter(
                Message.patient_email == current_user["email"],
                Message.provider_email == provider_email,
            )
            .order_by(Message.id)
            .all()
        )

    elif current_user["role"] == "provider":
        if not patient_email:
            raise HTTPException(status_code=400, detail="patient_email is required.")

        patient = db.query(UserModel).filter(UserModel.email == patient_email).first()
        if not patient or patient.provider_email != current_user["email"]:
            raise HTTPException(status_code=403, detail="This patient is not assigned to you.")

        messages = (
            db.query(Message)
            .filter(
                Message.patient_email == patient_email,
                Message.provider_email == current_user["email"],
            )
            .order_by(Message.id)
            .all()
        )
    else:
        raise HTTPException(status_code=403, detail="Unknown role.")

    return [{"id": m.id, "sender": m.sender, "text": m.text, "time": m.time} for m in messages]


@router.post("/", status_code=status.HTTP_201_CREATED)
def send_message(
    body: MessageCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if len(body.text) > MAX_MESSAGE_LENGTH:
        raise HTTPException(status_code=400, detail=f"Message exceeds {MAX_MESSAGE_LENGTH} characters.")

    if current_user["role"] == "patient":
        if not body.provider_email:
            raise HTTPException(status_code=400, detail="provider_email is required.")

        patient = db.query(UserModel).filter(UserModel.email == current_user["email"]).first()
        if not patient or patient.provider_email != body.provider_email:
            raise HTTPException(status_code=403, detail="You are not assigned to this provider.")

        new_msg = Message(
            patient_email=current_user["email"],  # from JWT — never from request body
            provider_email=body.provider_email,
            sender="patient",                      # from JWT role — never from request body
            text=body.text.strip(),
            time=body.time,
        )

    elif current_user["role"] == "provider":
        if not body.patient_email:
            raise HTTPException(status_code=400, detail="patient_email is required.")

        patient = db.query(UserModel).filter(UserModel.email == body.patient_email).first()
        if not patient or patient.provider_email != current_user["email"]:
            raise HTTPException(status_code=403, detail="This patient is not assigned to you.")

        new_msg = Message(
            patient_email=body.patient_email,
            provider_email=current_user["email"],  # from JWT — never from request body
            sender="provider",                      # from JWT role — never from request body
            text=body.text.strip(),
            time=body.time,
        )
    else:
        raise HTTPException(status_code=403, detail="Unknown role.")

    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return {"id": new_msg.id, "sender": new_msg.sender}