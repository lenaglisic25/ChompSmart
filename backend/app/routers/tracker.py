from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float
from pydantic import BaseModel

from app.database import get_db, Base

router = APIRouter(prefix="/tracker", tags=["tracker"])

# models 
class WaterLog(Base):
    __tablename__ = "water_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True)
    date = Column(String, index=True)
    water_oz = Column(Float, default=0.0)
    water_goal_oz = Column(Float, default=64.0)

class WeightLog(Base):
    __tablename__ = "weight_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True)
    date = Column(String, index=True)
    weight = Column(Float)


# schemas
class WaterUpdate(BaseModel):
    user_email: str
    date: str
    water_oz: float
    water_goal_oz: float

class WeightUpdate(BaseModel):
    user_email: str
    date: str
    weight: float


# water tracker
@router.post("/water")
def update_water(payload: WaterUpdate, db: Session = Depends(get_db)):
    log = db.query(WaterLog).filter(
        WaterLog.user_email == payload.user_email, 
        WaterLog.date == payload.date
    ).first()
    
    if log:
        log.water_oz = payload.water_oz
        log.water_goal_oz = payload.water_goal_oz
    else:
        log = WaterLog(
            user_email=payload.user_email, 
            date=payload.date, 
            water_oz=payload.water_oz, 
            water_goal_oz=payload.water_goal_oz
        )
        db.add(log)
        
    db.commit()
    return {"message": "Water updated"}

@router.get("/water/{email}")
def get_water(email: str, date: str, db: Session = Depends(get_db)):
    log = db.query(WaterLog).filter(
        WaterLog.user_email == email, 
        WaterLog.date == date
    ).first()
    
    if log:
        return {"water_oz": log.water_oz, "water_goal_oz": log.water_goal_oz}
    return {"water_oz": 0, "water_goal_oz": 64}


# weight tracker
@router.post("/weight")
def update_weight(payload: WeightUpdate, db: Session = Depends(get_db)):
    log = db.query(WeightLog).filter(
        WeightLog.user_email == payload.user_email, 
        WeightLog.date == payload.date
    ).first()
    
    if log:
        log.weight = payload.weight
    else:
        log = WeightLog(
            user_email=payload.user_email, 
            date=payload.date, 
            weight=payload.weight
        )
        db.add(log)
        
    db.commit()
    return {"message": "Weight updated"}

@router.get("/weight/{email}")
def get_weight_entries(email: str, db: Session = Depends(get_db)):
    logs = db.query(WeightLog).filter(WeightLog.user_email == email).all()
    return [{"date": log.date, "weight": log.weight} for log in logs]

@router.delete("/weight/{email}")
def delete_weight(email: str, date: str, db: Session = Depends(get_db)):
    db.query(WeightLog).filter(
        WeightLog.user_email == email, 
        WeightLog.date == date
    ).delete()
    db.commit()
    return {"message": "Weight deleted"}