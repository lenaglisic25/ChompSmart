from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.profile import Profile
from app.schemas import profile as profile_schema

router = APIRouter(prefix="/profile", tags=["profiles"])

@router.post("/", response_model=profile_schema.Profile)
def create_or_update_profile(profile: profile_schema.ProfileCreate, db: Session = Depends(get_db)):
    if not profile.user_email:
        raise HTTPException(status_code=400, detail="user_email is required")

    existing_profile = db.query(Profile).filter(Profile.user_email == profile.user_email).first()

    profile_data = profile.dict(exclude_unset=True)

    if existing_profile:
        for key, value in profile_data.items():
            setattr(existing_profile, key, value)
        db.commit()
        db.refresh(existing_profile)
        return existing_profile
    else:
        new_profile = Profile(**profile_data)
        db.add(new_profile)
        db.commit()
        db.refresh(new_profile)
        return new_profile



@router.get("/", response_model=list[profile_schema.Profile])
def get_profiles(db: Session = Depends(get_db)):
    profiles = db.query(Profile).all()
    return profiles