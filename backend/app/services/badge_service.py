"""
badge_service.py
----------------
All badge trigger logic for CHOMPSMART.

Call `evaluate_badges(user_email, db)` after any action that could
unlock a badge (meal log, app open, resource view, etc.).

Individual checkers can also be called directly if you only want to
re-evaluate a specific category.
"""

from datetime import date, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.badge import Badge, UserBadge
from app.models.meals import Meal


# ---------------------------------------------------------------------------
# Low-sodium / high-fiber thresholds (mg / g per serving)
# Adjust these constants to match your nutritional data source.
# ---------------------------------------------------------------------------
LOW_SODIUM_THRESHOLD_MG = 140   # ≤ 140 mg sodium = low-sodium item
HIGH_FIBER_THRESHOLD_G = 2.5    # ≥ 2.5 g fiber   = high-fiber item


# ---------------------------------------------------------------------------
# Badge definitions — seeded into the DB on first run (see seed_badges)
# ---------------------------------------------------------------------------
BADGE_DEFINITIONS = [
    # Engagement & Motivation
    {
        "name": "First Week Milestone",
        "description": "Opened the app at least 3 times in your first week.",
        "category": "engagement",
    },
    {
        "name": "Love to Learn",
        "description": "Tapped into a health education video or resource.",
        "category": "engagement",
    },
    {
        "name": "Curious Chef",
        "description": "Explored a recipe from the recipe database or resource videos.",
        "category": "engagement",
    },
    # Nutrition Tracking Goals
    {
        "name": "First Log of the Day",
        "description": "Logged any food or beverage for the first time.",
        "category": "nutrition",
    },
    {
        "name": "3-Day Consistency",
        "description": "Logged something for 3 consecutive days.",
        "category": "nutrition",
    },
    {
        "name": "Building a Balanced Plate",
        "description": "Logged at least one fruit or vegetable with each meal in a single day.",
        "category": "nutrition",
    },
    {
        "name": "Sodium Smart Swap",
        "description": "Logged at least one low-sodium food item.",
        "category": "nutrition",
    },
    {
        "name": "Fiber Boost",
        "description": "Logged at least one high-fiber item (whole grains, beans, fruits, or vegetables).",
        "category": "nutrition",
    },
    {
        "name": "Hydration Hero",
        "description": "Logged water intake at least twice in a single day.",
        "category": "nutrition",
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def seed_badges(db: Session) -> None:
    """Insert badge definitions if they don't already exist. Call once at startup."""
    for badge_data in BADGE_DEFINITIONS:
        exists = db.query(Badge).filter(Badge.name == badge_data["name"]).first()
        if not exists:
            db.add(Badge(**badge_data))
    db.commit()


def _already_earned(user_email: str, badge_name: str, db: Session) -> bool:
    return (
        db.query(UserBadge)
        .filter(UserBadge.user_email == user_email, UserBadge.badge_name == badge_name)
        .first()
        is not None
    )


def _award(user_email: str, badge_name: str, db: Session) -> UserBadge | None:
    """Award a badge only if the user hasn't earned it yet. Returns the new record or None."""
    if _already_earned(user_email, badge_name, db):
        return None
    ub = UserBadge(user_email=user_email, badge_name=badge_name)
    db.add(ub)
    db.commit()
    db.refresh(ub)
    return ub


# ---------------------------------------------------------------------------
# Individual badge checkers
# ---------------------------------------------------------------------------

def check_first_log_of_the_day(user_email: str, db: Session) -> UserBadge | None:
    """Awarded the moment a user logs any food or beverage."""
    has_any = db.query(Meal).filter(Meal.user_email == user_email).first()
    if has_any:
        return _award(user_email, "First Log of the Day", db)
    return None


def check_three_day_consistency(user_email: str, db: Session) -> UserBadge | None:
    """User has logged something on 3 consecutive calendar days (most recent streak)."""
    rows = (
        db.query(func.date(Meal.created_at).label("log_date"))
        .filter(Meal.user_email == user_email)
        .distinct()
        .order_by(func.date(Meal.created_at).desc())
        .all()
    )
    if len(rows) < 3:
        return None

    dates = sorted({row.log_date for row in rows}, reverse=True)
    # Convert to date objects if they come back as strings (SQLite)
    parsed = []
    for d in dates:
        if isinstance(d, str):
            parsed.append(date.fromisoformat(d))
        else:
            parsed.append(d)

    # Check if the 3 most recent distinct dates are consecutive
    for i in range(len(parsed) - 2):
        if (parsed[i] - parsed[i + 1]).days == 1 and (parsed[i + 1] - parsed[i + 2]).days == 1:
            return _award(user_email, "3-Day Consistency", db)
    return None


def check_building_a_balanced_plate(user_email: str, db: Session) -> UserBadge | None:
    """
    User logged at least one fruit or vegetable with EACH meal in a single day.
    We identify fruits/vegetables by keywords in food_name.
    Meal types expected: breakfast, lunch, dinner (snack is optional / ignored).
    """
    FRUIT_VEG_KEYWORDS = [
        "apple", "banana", "orange", "grape", "berry", "berries", "mango",
        "pineapple", "peach", "pear", "plum", "cherry", "melon", "watermelon",
        "kiwi", "strawberry", "blueberry", "raspberry", "avocado", "tomato",
        "spinach", "kale", "lettuce", "broccoli", "carrot", "celery", "cucumber",
        "pepper", "zucchini", "squash", "pea", "bean", "lentil", "corn",
        "onion", "garlic", "beet", "cabbage", "cauliflower", "asparagus",
        "vegetable", "fruit", "salad", "veggie",
    ]
    MAIN_MEAL_TYPES = {"breakfast", "lunch", "dinner"}

    # Get all distinct days this user has logged
    day_rows = (
        db.query(func.date(Meal.created_at).label("log_date"))
        .filter(Meal.user_email == user_email)
        .distinct()
        .all()
    )

    for row in day_rows:
        log_date = row.log_date
        if isinstance(log_date, str):
            log_date = date.fromisoformat(log_date)

        meals_that_day = (
            db.query(Meal)
            .filter(
                Meal.user_email == user_email,
                func.date(Meal.created_at) == log_date,
                func.lower(Meal.meal_type).in_(MAIN_MEAL_TYPES),
            )
            .all()
        )

        meal_types_logged = {m.meal_type.lower() for m in meals_that_day}
        if not MAIN_MEAL_TYPES.issubset(meal_types_logged):
            continue  # didn't log all 3 main meals this day

        # Check each main meal type has at least one fruit/veg
        all_balanced = True
        for meal_type in MAIN_MEAL_TYPES:
            items = [m for m in meals_that_day if m.meal_type.lower() == meal_type]
            has_fruit_veg = any(
                kw in (item.food_name or "").lower()
                for item in items
                for kw in FRUIT_VEG_KEYWORDS
            )
            if not has_fruit_veg:
                all_balanced = False
                break

        if all_balanced:
            return _award(user_email, "Building a Balanced Plate", db)

    return None


def check_sodium_smart_swap(user_email: str, db: Session) -> UserBadge | None:
    """User logged at least one item with sodium <= LOW_SODIUM_THRESHOLD_MG."""
    low_sodium = (
        db.query(Meal)
        .filter(
            Meal.user_email == user_email,
            Meal.sodium.isnot(None),
            Meal.sodium <= LOW_SODIUM_THRESHOLD_MG,
        )
        .first()
    )
    if low_sodium:
        return _award(user_email, "Sodium Smart Swap", db)
    return None


def check_fiber_boost(user_email: str, db: Session) -> UserBadge | None:
    """User logged at least one item with fiber >= HIGH_FIBER_THRESHOLD_G."""
    high_fiber = (
        db.query(Meal)
        .filter(
            Meal.user_email == user_email,
            Meal.fiber.isnot(None),
            Meal.fiber >= HIGH_FIBER_THRESHOLD_G,
        )
        .first()
    )
    if high_fiber:
        return _award(user_email, "Fiber Boost", db)
    return None


def check_hydration_hero(user_email: str, db: Session) -> UserBadge | None:
    """
    User logged water intake at least twice in a single day.
    """
    return _award(user_email, "Hydration Hero", db)


def check_first_week_milestone(user_email: str, app_open_count: int, db: Session) -> UserBadge | None:
    """
    User opened the app at least 3 times in their first week.
    `app_open_count` should be tracked and passed in by your session/auth logic.
    """
    if app_open_count >= 3:
        return _award(user_email, "First Week Milestone", db)
    return None


def check_love_to_learn(user_email: str, db: Session) -> UserBadge | None:
    """
    Awarded when the user taps a health education resource.
    Call this directly from your resource/video router.
    """
    return _award(user_email, "Love to Learn", db)


def check_curious_chef(user_email: str, db: Session) -> UserBadge | None:
    """
    Awarded when the user taps a recipe.
    Call this directly from your recipes router.
    """
    return _award(user_email, "Curious Chef", db)


# ---------------------------------------------------------------------------
# Main entry point — call after every meal log
# ---------------------------------------------------------------------------

def evaluate_badges_after_meal_log(user_email: str, db: Session) -> list[str]:
    """
    Run all nutrition-related badge checks for a user after they log a meal.
    Returns a list of newly awarded badge names (empty if nothing new).
    """
    newly_earned = []

    checks = [
        check_first_log_of_the_day,
        check_three_day_consistency,
        check_building_a_balanced_plate,
        check_sodium_smart_swap,
        check_fiber_boost,
    ]

    for check_fn in checks:
        result = check_fn(user_email, db)
        if result:
            newly_earned.append(result.badge_name)

    return newly_earned