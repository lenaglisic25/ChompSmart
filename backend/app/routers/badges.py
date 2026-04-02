"""
routers/badges.py
-----------------
Badge-related API endpoints for CHOMPSMART.

Endpoints:
  GET  /badges/                      — list all badge definitions
  GET  /badges/user/{email}          — get all badges a user has earned
  GET  /badges/user/{email}/unnotified — badges earned but not yet shown (for popup)
  POST /badges/user/{email}/notified  — mark badges as notified (call after popup shown)
  POST /badges/trigger/resource       — trigger Love to Learn badge
  POST /badges/trigger/recipe         — trigger Curious Chef badge
  POST /badges/trigger/app-open       — trigger First Week Milestone badge
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.badge import Badge, UserBadge
from app.services.badge_service import (
    check_love_to_learn,
    check_curious_chef,
    check_first_week_milestone,
    seed_badges,
)

router = APIRouter(prefix="/badges", tags=["badges"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class AppOpenPayload(BaseModel):
    user_email: str
    app_open_count: int  # total opens tracked by the client / auth service


class ResourcePayload(BaseModel):
    user_email: str


class BadgeOut(BaseModel):
    name: str
    description: str
    category: str

    class Config:
        from_attributes = True


class UserBadgeOut(BaseModel):
    badge_name: str
    earned_at: str
    notified: bool

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[BadgeOut])
def list_all_badges(db: Session = Depends(get_db)):
    """Return all badge definitions — useful for the frontend to display a badge shelf."""
    return db.query(Badge).all()


@router.get("/user/{email}", response_model=list[UserBadgeOut])
def get_user_badges(email: str, db: Session = Depends(get_db)):
    """Return all badges earned by a specific user."""
    badges = db.query(UserBadge).filter(UserBadge.user_email == email).all()
    return [
        UserBadgeOut(
            badge_name=b.badge_name,
            earned_at=b.earned_at.isoformat(),
            notified=b.notified,
        )
        for b in badges
    ]


@router.get("/user/{email}/unnotified", response_model=list[UserBadgeOut])
def get_unnotified_badges(email: str, db: Session = Depends(get_db)):
    """
    Return badges the user has earned but hasn't been notified about yet.
    The frontend should poll this (or call it after a meal log) to show popups.
    """
    badges = (
        db.query(UserBadge)
        .filter(UserBadge.user_email == email, UserBadge.notified == False)
        .all()
    )
    return [
        UserBadgeOut(
            badge_name=b.badge_name,
            earned_at=b.earned_at.isoformat(),
            notified=b.notified,
        )
        for b in badges
    ]


@router.post("/user/{email}/notified")
def mark_badges_notified(email: str, db: Session = Depends(get_db)):
    """
    Mark all unnotified badges for this user as notified.
    Call this after the frontend has shown the badge unlock popup.
    """
    db.query(UserBadge).filter(
        UserBadge.user_email == email, UserBadge.notified == False
    ).update({"notified": True})
    db.commit()
    return {"message": "Badges marked as notified."}


@router.post("/trigger/resource")
def trigger_resource_badge(payload: ResourcePayload, db: Session = Depends(get_db)):
    """
    Call this from your resource/video router when a user taps a health education resource.
    Awards the 'Love to Learn' badge.
    """
    result = check_love_to_learn(payload.user_email, db)
    if result:
        return {"awarded": True, "badge": result.badge_name}
    return {"awarded": False, "message": "Badge already earned or not yet unlocked."}


@router.post("/trigger/recipe")
def trigger_recipe_badge(payload: ResourcePayload, db: Session = Depends(get_db)):
    """
    Call this from your recipes router when a user taps a recipe.
    Awards the 'Curious Chef' badge.
    """
    result = check_curious_chef(payload.user_email, db)
    if result:
        return {"awarded": True, "badge": result.badge_name}
    return {"awarded": False, "message": "Badge already earned or not yet unlocked."}


@router.post("/trigger/app-open")
def trigger_app_open_badge(payload: AppOpenPayload, db: Session = Depends(get_db)):
    """
    Call this from your auth/session logic each time a user opens the app.
    Pass the total open count — awards 'First Week Milestone' at 3+ opens.
    """
    result = check_first_week_milestone(payload.user_email, payload.app_open_count, db)
    if result:
        return {"awarded": True, "badge": result.badge_name}
    return {"awarded": False, "message": "Badge already earned or threshold not met yet."}
