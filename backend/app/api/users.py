from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User as UserModel
from app.schemas.user import UserCreate, User as UserSchema

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

@router.post("/login", response_model=UserSchema)
def login_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(UserModel).filter(UserModel.email == user.email).first()

    if not existing_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    
    if existing_user.password != user.password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password.")
    
    return existing_user

@router.post("/create", response_model=UserSchema)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(UserModel).filter(UserModel.email == user.email).first()

    if existing_user:
        return {"message": "User already exists."}, status.HTTP_400_BAD_REQUEST
      
    new_user = UserModel(email=user.email, password=user.password)
    db.add(new_user)
    db.commit()

    return new_user

@router.get("/", response_model=list[UserSchema])
def get_users(db: Session = Depends(get_db)):
    users = db.query(UserModel).all()
    return users

