from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db
from app.schemas import user as user_schema

router = APIRouter() 

@router.post("/", response_model=user_schema.User, summary="Create user")
def create_user(payload: user_schema.UserCreate, db: Session = Depends(get_db)):
    db_user = models.user.User(**payload.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/", response_model=List[schemas.user.User], summary="List users")
def get_users(db: Session = Depends(get_db)):
    return db.query(models.user.User).all()

@router.get("/{user_id}", response_model=schemas.user.User, summary="Get user by id")
def get_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
