import csv
import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.profile import Profile

router = APIRouter(prefix="/recipes", tags=["recipes"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
RECIPES_DIR = BASE_DIR / "data" / "recipes"
CSV_DIR = RECIPES_DIR / "csv"
IMAGES_DIR = RECIPES_DIR / "images"

PROFILE_TO_CSV_COLUMN = {
    "Dairy-free": "Dairy-Free",
    "Egg-free": "Egg-Free",
    "Gluten-free": "Gluten-Free",
    "Keto": "Keto",
    "Low-carb": "Low-Carb",
    "Low-fat": "Low-Fat",
    "Low-salt": "Low-Salt",
    "Low-sugar": "Low-Sugar",
    "No seafood": "No Seafood",
    "Paleo": "Paleo",
    "Soy-free": "Soy-Free",
    "Vegan": "Vegan",
    "Vegetarian": "Vegetarian",
}

CSV_COLUMN_TO_PROFILE = {}
for profile_label, csv_col in PROFILE_TO_CSV_COLUMN.items():
    CSV_COLUMN_TO_PROFILE[csv_col] = profile_label

MEAL_CSV_FILES = [
    ("Breakfast", "Breakfast.Recipe.Database.2.13.csv"),
    ("Lunch", "Lunch.Recipe.Database.2.13.csv"),
    ("Dinner", "Dinner.Recipe.Database.2.13.csv"),
    ("Dessert", "Dessert.Recipe.Database.2.13.csv"),
]
DIET_FLAGS_FILE = "Recipe.Database.Diet.Flags.2.13.csv"


def _normalize_header(key):
    k = (key or "").strip()
    if "Recipe Title" in k:
        return "Recipe Title"
    if "Serving Size" in k:
        return "Serving Size"
    if "Total Preparation" in k or "Preparation Time" in k:
        return "Total Preparation Time (min)"
    if k == "Ingredients":
        return "Ingredients"
    if k == "Steps":
        return "Steps"
    if "Total Calories" in k or "Calories" in k:
        return "calories"
    if "Protein" in k and "Per Serving" in k:
        return "protein_g"
    if "Carbohydrates" in k:
        return "carbs_g"
    if "Fat (g)" in k or ("Fat" in k and "Per" in k):
        return "fat_g"
    if "Fiber" in k:
        return "fiber_g"
    if "Sodium" in k:
        return "sodium_mg"
    return k


def _slug(title):
    if not title:
        return ""
    lower = title.lower()
    letters_and_digits = re.sub(r"[^a-z0-9]+", "", lower)
    return letters_and_digits


def _find_image(slug):
    if not slug:
        return None
    extensions = [".jpg", ".jpeg", ".png", ".webp"]
    for ext in extensions:
        file_path = IMAGES_DIR / (slug + ext)
        if file_path.is_file():
            return file_path.name
    if not IMAGES_DIR.is_dir():
        return None
    slug_len = len(slug)
    for path in IMAGES_DIR.iterdir():
        if not path.is_file():
            continue
        stem = path.stem
        stem_norm = re.sub(r"[^a-z0-9]+", "", stem.lower())
        if stem_norm == slug:
            return path.name
        if slug_len >= 10 and stem_norm in slug:
            return path.name
        if len(stem_norm) >= 10 and slug in stem_norm:
            return path.name
    return None


def _get_cell(row, norm_key):
    for orig in row:
        if _normalize_header(orig) == norm_key:
            v = row.get(orig)
            return v if v is not None else ""
    for orig in row:
        if norm_key == "calories" and "Calories" in orig:
            return row.get(orig) or ""
        if norm_key == "protein_g" and "Protein" in orig:
            return row.get(orig) or ""
        if norm_key == "carbs_g" and "Carbohydrates" in orig:
            return row.get(orig) or ""
        if norm_key == "fat_g" and "Fat" in orig:
            return row.get(orig) or ""
        if norm_key == "fiber_g" and "Fiber" in orig:
            return row.get(orig) or ""
        if norm_key == "sodium_mg" and "Sodium" in orig:
            return row.get(orig) or ""
    return ""


def _parse_number(s):
    if s is None or s == "":
        return None
    text = str(s).strip().replace(",", ".")
    if "-" in text and not text.startswith("-"):
        text = text.split("-")[0].strip()
    try:
        return float(text)
    except ValueError:
        return None


def _parse_recipe_row(row, category):
    title = _get_cell(row, "Recipe Title")
    title = (title or row.get("Recipe Title", "")).strip()
    if not title:
        return None

    serving = _get_cell(row, "Serving Size")
    minutes_raw = _get_cell(row, "Total Preparation Time (min)")
    ingredients = _get_cell(row, "Ingredients") or row.get("Ingredients", "")
    steps = _get_cell(row, "Steps") or row.get("Steps", "")
    calories_raw = _get_cell(row, "calories") or row.get("Total Calories (cal) Per Serving") or row.get("Total Calories Per Serving (cal)") or row.get("Total Calories (cal)", "")
    protein = _get_cell(row, "protein_g") or ""
    carbs = _get_cell(row, "carbs_g") or ""
    fat = _get_cell(row, "fat_g") or ""
    fiber = _get_cell(row, "fiber_g") or ""
    sodium = _get_cell(row, "sodium_mg") or ""

    return {
        "title": title,
        "category": category,
        "serving_size": (serving or "").strip(),
        "minutes": (minutes_raw or "").strip(),
        "ingredients": (ingredients or "").strip(),
        "steps": (steps or "").strip(),
        "calories": _parse_number(calories_raw),
        "protein_g": _parse_number(protein),
        "carbs_g": _parse_number(carbs),
        "fat_g": _parse_number(fat),
        "fiber_g": _parse_number(fiber),
        "sodium_mg": _parse_number(sodium),
        "slug": _slug(title),
    }


def _load_recipe_rows():
    recipes = []
    for category, filename in MEAL_CSV_FILES:
        path = CSV_DIR / filename
        if not path.is_file():
            continue
        with open(path, newline="", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rec = _parse_recipe_row(row, category)
                if rec is not None:
                    recipes.append(rec)
    return recipes


def _load_diet_flags():
    path = CSV_DIR / DIET_FLAGS_FILE
    if not path.is_file():
        return {}
    flags_by_key = {}
    with open(path, newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cat = (row.get("Category") or "").strip()
            title = (row.get("Recipe Title") or "").strip()
            key = (cat, title)
            row_clean = {}
            for k, v in row.items():
                if not k:
                    continue
                if k.strip() in ("Category", "Recipe Title", "Net Carbs (g) Per Serving", "Notes"):
                    continue
                row_clean[k.strip()] = (v or "").strip()
            flags_by_key[key] = row_clean
    return flags_by_key


def _get_dietary_tags(flags_row):
    tags = []
    if flags_row is None:
        return tags
    for csv_col, profile_label in CSV_COLUMN_TO_PROFILE.items():
        value = (flags_row.get(csv_col) or "").strip().lower()
        if value == "yes":
            tags.append(profile_label)
    return tags


def _recipe_matches_restrictions(flags_row, user_restrictions):
    if not user_restrictions:
        return True
    for rest in user_restrictions:
        csv_col = PROFILE_TO_CSV_COLUMN.get(rest)
        if csv_col is None:
            continue
        value = (flags_row or {}).get(csv_col, "").strip().lower()
        if value != "yes":
            return False
    return True


def _build_recipes_with_flags(user_restrictions=None):
    recipes = _load_recipe_rows()
    flags = _load_diet_flags()
    out = []
    for r in recipes:
        key = (r["category"], r["title"])
        flags_row = flags.get(key)
        if user_restrictions is not None:
            if not _recipe_matches_restrictions(flags_row, user_restrictions):
                continue
        dietary_tags = _get_dietary_tags(flags_row)
        image_filename = _find_image(r["slug"])
        recipe_out = dict(r)
        recipe_out["dietary_tags"] = dietary_tags
        recipe_out["image_filename"] = image_filename
        out.append(recipe_out)
    return out


@router.get("")
def list_recipes(
    user_email: str | None = Query(None),
    db: Session = Depends(get_db),
):
    user_restrictions = None
    if user_email:
        profile = db.query(Profile).filter(Profile.user_email == user_email).first()
        if profile is not None:
            dr = getattr(profile, "dietary_restrictions", None)
            if isinstance(dr, list) and dr:
                user_restrictions = [r for r in dr if r]
    recipes = _build_recipes_with_flags(user_restrictions)
    return {"recipes": recipes}


@router.get("/images/{filename:path}")
def serve_recipe_image(filename: str):
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = IMAGES_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path)
