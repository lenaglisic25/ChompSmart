from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas import preferences as pref_schema
from app.models import preferences as pref_model
from app.database import get_db

router = APIRouter(prefix="/preferences", tags=["preferences"])

@router.post("/", response_model=pref_schema.Preferences)
def create_preferences(pref: pref_schema.PreferencesCreate, db: Session = Depends(get_db)):
    new_pref = pref_model.Preferences(**pref.dict())
    db.add(new_pref)
    db.commit()
    db.refresh(new_pref)
    return new_pref
