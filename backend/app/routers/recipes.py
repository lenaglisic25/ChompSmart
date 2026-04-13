import csv
import io
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
    "Dairy-free": "Dairy?Free",
    "Egg-free": "Egg?Free",
    "Gluten-free": "Gluten?Free",
    "Keto": "Keto",
    "Low-carb": "Low?Carb",
    "Low-fat": "Low?Fat",
    "Low-salt": "Low?Salt",
    "Low-sugar": "Low?Sugar",
    "No seafood": "No Seafood",
    "Nut-free": "Nut?Free",
    "Paleo": "Paleo",
    "Soy-free": "Soy?Free",
    "Vegan": "Vegan",
    "Vegetarian": "Vegetarian",
}

CSV_COLUMN_TO_PROFILE = {}
for profile_label, csv_col in PROFILE_TO_CSV_COLUMN.items():
    CSV_COLUMN_TO_PROFILE[csv_col] = profile_label

MEAL_CSV_FILES = [
    ("Breakfast", "MASTER Recipe Database(Breakfast Recipes).csv"),
    ("Lunch", "MASTER Recipe Database(Lunch Recipes).csv"),
    ("Dinner", "MASTER Recipe Database(Dinner Recipes).csv"),
    ("Dessert", "MASTER Recipe Database(Dessert Recipes).csv"),
]

COOKBOOKS_DIR = CSV_DIR / "Cookbooks DB"
COOKBOOK_RECIPE_FILES = [
    ("Breakfast", "cookbooks_breakfast_recipe_database_CORRECTED.csv"),
    ("Lunch", "cookbooks_lunch_recipe_database_CORRECTED.csv"),
    ("Dinner", "cookbooks_dinner_recipe_database_CORRECTED.csv"),
    ("Dessert", "cookbooks_dessert_recipe_database_CORRECTED.csv"),
    ("Snack", "cookbooks_snack_recipe_database_CORRECTED.csv"),
    ("Other", "cookbooks_other_recipe_database_CORRECTED.csv"),
]
COOKBOOK_DIET_FILES = [
    ("Lunch", "cookbooks_lunch_diet_restrictions.csv"),
    ("Dinner", "cookbooks_dinner_diet_restrictions.csv"),
    ("Dessert", "cookbooks_dessert_diet_restrictions.csv"),
    ("Snack", "cookbooks_snack_diet_restrictions.csv"),
    ("Other", "cookbooks_other_diet_restrictions.csv"),
]

COOKBOOK_DIET_COL_TO_INTERNAL = {
    "Dairy_Free": "Dairy?Free",
    "Egg_Free": "Egg?Free",
    "Gluten_Free": "Gluten?Free",
    "Keto": "Keto",
    "Low_Carb": "Low?Carb",
    "Low_Fat": "Low?Fat",
    "Low_Salt": "Low?Salt",
    "Low_Sugar": "Low?Sugar",
    "No Seafood": "No Seafood",
    "Paleo": "Paleo",
    "Soy_Free": "Soy?Free",
    "Vegan": "Vegan",
    "Vegetarian": "Vegetarian",
}

DIET_FLAGS_FILE = "Recipe.Database.Including.Dietary.Flags.2.27.csv"
CUISINE_FILE = "Cuisine.Analysis.Recipe.csv"
EQUIPMENT_FILE = "Equipment.Analysis.Recipe.csv"

IMAGE_OVERRIDES = {
    "polloalaplanchaorgriddledchickenwithhomemademojomarinade": "Pollo.A.La.Plancha.DINNER.jpg",
    "caribbeangrilledshrimpplantainskillet": "Caribbean.Style.Shrimp.Plantain.Skillet.DINNER.jpg",
    "greekbeefsouvlakiwithtzatziki": "Greek.Beef.Souvlaki.Tzatiziki.DINNER.jpg",
    "italianturkeybologneseoverwholewheatpasta": "Italian.Turkey.Bolognese.DINNER.jpg",
    "latinamericanchickenblackbeantacos": "Chicken.Black.Bean.Tacos.DINNER.jpg",
    "leanbeefburgers": "Lean Beef Hamburger.DINNER.jpg",
    "spicysouthwestbakedsalmonwithsweetpotatoandgrains": "Southwest.Baked.Salmon.DINNER.jpg",
    "turkishporkkebabswithyogurtcucumbersalad": "Turkish.Pork.Kebabs.DINNER.jpg",
    "vegetarianeggrollinabowl": "Vegetarian.Egg.Roll.Bowl.DINNER.jpg",
    "bananapeanutbutteryogurtparfait": "Banana.PB.Yogurt.Parfait.DESSERTS.jpg",
    "blueberrybananasmoothie": "Banana.Blueberry.Smoothie.DESSERT.jpg",
}


def _open_csv(path):
    """Return a StringIO for the CSV, auto-detecting UTF-8 vs cp1252/latin-1."""
    raw = path.read_bytes()
    for enc in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        text = raw.decode("latin-1", errors="replace")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return io.StringIO(text)


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
    if "Sugar" in k and "Per Serving" in k:
        return "sugar_g"
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
    if slug in IMAGE_OVERRIDES:
        candidate = IMAGE_OVERRIDES[slug]
        if (IMAGES_DIR / candidate).is_file():
            return candidate
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
        if norm_key == "sugar_g" and "Sugar" in orig:
            return row.get(orig) or ""
    return ""


def _clean_text(text):
    """Replace ? with - when it appears between word characters (CSV export artifact)."""
    if not text:
        return text
    return re.sub(r"(?<=[A-Za-z0-9/])\?(?=[A-Za-z0-9])", "-", text)


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


def _split_equipment_tags(raw):
    if not raw or not str(raw).strip():
        return []
    parts = re.split(r",|\bor\b", str(raw), flags=re.IGNORECASE)
    return [p.strip() for p in parts if p.strip()]


def _yes_no_to_true_false(val):
    v = (val or "").strip().lower()
    return "true" if v == "yes" else "false"


def _cookbook_diet_row_to_flags(row):
    out = {}
    for src_col, internal in COOKBOOK_DIET_COL_TO_INTERNAL.items():
        out[internal] = _yes_no_to_true_false(row.get(src_col))
    out["Nut?Free"] = "false"
    return out


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
    sugar = _get_cell(row, "sugar_g") or ""

    rec = {
        "title": title,
        "diet_lookup_title": title,
        "category": category,
        "serving_size": (serving or "").strip(),
        "minutes": (minutes_raw or "").strip(),
        "ingredients": _clean_text((ingredients or "").strip()),
        "steps": _clean_text((steps or "").strip()),
        "calories": _parse_number(calories_raw),
        "protein_g": _parse_number(protein),
        "carbs_g": _parse_number(carbs),
        "fat_g": _parse_number(fat),
        "fiber_g": _parse_number(fiber),
        "sodium_mg": _parse_number(sodium),
        "sugar_g": _parse_number(sugar),
        "slug": _slug(title),
    }
    cuisine_tags = (row.get("Cuisine Tags") or "").strip()
    meal_type_tags = (row.get("Meal Type Tags") or "").strip()
    equipment_raw = (row.get("Equipment Tags") or "").strip()
    photo_url = (row.get("Photo URL") or "").strip()
    source_url = (row.get("Source URL") or "").strip()
    healthier = (row.get("Healthier Changes") or "").strip()
    if healthier:
        rec["healthier_changes"] = _clean_text(healthier)
    if cuisine_tags or meal_type_tags or equipment_raw or photo_url or source_url:
        rec["cuisine_tags"] = cuisine_tags
        rec["meal_type_tags"] = meal_type_tags
        rec["equipment_tags_csv"] = _split_equipment_tags(equipment_raw)
        rec["photo_url"] = photo_url
        rec["source_url"] = source_url
    return rec


def _dedupe_recipe_titles(recipes):
    counts = {}
    for r in recipes:
        base = r["diet_lookup_title"]
        k = (r["category"], base)
        counts[k] = counts.get(k, 0) + 1
        n = counts[k]
        if n > 1:
            r["title"] = f"{base} ({n})"
        else:
            r["title"] = base
        r["slug"] = _slug(r["title"])


def _load_recipe_rows():
    recipes = []
    for category, filename in MEAL_CSV_FILES:
        path = CSV_DIR / filename
        if not path.is_file():
            continue
        with _open_csv(path) as f:
            reader = csv.DictReader(f)
            for row in reader:
                rec = _parse_recipe_row(row, category)
                if rec is not None:
                    rec["recommended"] = True
                    recipes.append(rec)
    for category, filename in COOKBOOK_RECIPE_FILES:
        path = COOKBOOKS_DIR / filename
        if not path.is_file():
            continue
        with _open_csv(path) as f:
            reader = csv.DictReader(f)
            for row in reader:
                rec = _parse_recipe_row(row, category)
                if rec is not None:
                    rec["recommended"] = False
                    recipes.append(rec)
    _dedupe_recipe_titles(recipes)
    return recipes


def _load_cookbook_diet_flags():
    flags_by_key = {}
    for category, filename in COOKBOOK_DIET_FILES:
        path = COOKBOOKS_DIR / filename
        if not path.is_file():
            continue
        with _open_csv(path) as f:
            reader = csv.DictReader(f)
            for row in reader:
                title = (row.get("Recipe") or "").strip()
                if not title:
                    continue
                key = (category, title)
                flags_by_key[key] = _cookbook_diet_row_to_flags(row)
    return flags_by_key


def _load_diet_flags():
    path = CSV_DIR / DIET_FLAGS_FILE
    if not path.is_file():
        return {}
    flags_by_key = {}
    skip_cols = {"Meal Type", "Recipe", "Net Carbs (g)", "Notes"}
    with _open_csv(path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            cat = (row.get("Meal Type") or "").strip()
            cat = cat.replace(" Recipes", "")
            title = (row.get("Recipe") or "").strip()
            key = (cat, title)
            row_clean = {}
            for k, v in row.items():
                if not k:
                    continue
                if k.strip() in skip_cols:
                    continue
                row_clean[k.strip()] = (v or "").strip()
            flags_by_key[key] = row_clean
    return flags_by_key


def _load_cuisine_data():
    path = CSV_DIR / CUISINE_FILE
    if not path.is_file():
        return {}
    cuisine_by_title = {}
    with _open_csv(path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            title = (row.get("Title") or "").strip()
            cuisine = (row.get("Primary Cuisine") or "").strip()
            also_tagged = (row.get("Also Tagged") or "").strip()
            if title:
                cuisine_by_title[title] = {
                    "primary_cuisine": cuisine,
                    "also_tagged": also_tagged,
                }
    return cuisine_by_title


def _load_equipment_data():
    path = CSV_DIR / EQUIPMENT_FILE
    if not path.is_file():
        return {}

    equipment_by_key = {}
    non_tag_columns = {"Recipe Title", "Category", "Matched Phrases (evidence)"}

    with _open_csv(path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            title = (row.get("Recipe Title") or "").strip()
            cat = (row.get("Category") or "").strip()
            cat = cat.replace(" Recipes", "")
            if not title or not cat:
                continue

            tags = []
            for column_name, raw_value in row.items():
                if not column_name:
                    continue
                column_name = column_name.strip()
                if column_name in non_tag_columns:
                    continue
                value = (raw_value or "").strip().lower()
                if value == "true":
                    tags.append(column_name)

            equipment_by_key[(cat, title)] = tags

    return equipment_by_key


def _get_dietary_tags(flags_row):
    tags = []
    if flags_row is None:
        return tags
    for csv_col, profile_label in CSV_COLUMN_TO_PROFILE.items():
        value = (flags_row.get(csv_col) or "").strip().lower()
        if value == "true":
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
        if value != "true":
            return False
    return True


def _build_recipes_with_flags(user_restrictions=None):
    recipes = _load_recipe_rows()
    flags = _load_diet_flags()
    flags.update(_load_cookbook_diet_flags())
    cuisine_data = _load_cuisine_data()
    equipment_data = _load_equipment_data()
    out = []
    for r in recipes:
        lookup_key = (r["category"], r["diet_lookup_title"])
        flags_row = flags.get(lookup_key)
        if user_restrictions is not None:
            if not _recipe_matches_restrictions(flags_row, user_restrictions):
                continue
        dietary_tags = _get_dietary_tags(flags_row)
        eq_key = (r["category"], r["title"])
        equipment_tags = equipment_data.get(eq_key, [])
        if r.get("equipment_tags_csv"):
            equipment_tags = r["equipment_tags_csv"]
        cuisine_info = cuisine_data.get(r["title"], {})
        if r.get("cuisine_tags"):
            cuisine_primary = r["cuisine_tags"]
            cuisine_also = (r.get("meal_type_tags") or "").strip()
        else:
            cuisine_primary = cuisine_info.get("primary_cuisine", "")
            cuisine_also = cuisine_info.get("also_tagged", "")
        photo_raw = (r.get("photo_url") or "").strip()
        if photo_raw.lower().startswith(("http://", "https://")):
            photo_url = photo_raw
            image_filename = None
        else:
            photo_url = None
            image_filename = _find_image(r["slug"])
       
        # Dont use images from cookbooks DB rows (currently random stock images)
        if not r.get("recommended"):
            photo_url = None
            image_filename = None
        recipe_out = dict(r)
        recipe_out.pop("diet_lookup_title", None)
        recipe_out.pop("equipment_tags_csv", None)
        recipe_out.pop("cuisine_tags", None)
        recipe_out.pop("meal_type_tags", None)
        recipe_out["dietary_tags"] = dietary_tags
        recipe_out["equipment_tags"] = equipment_tags
        recipe_out["image_filename"] = image_filename
        recipe_out["photo_url"] = photo_url
        recipe_out["cuisine"] = cuisine_primary
        recipe_out["cuisine_also_tagged"] = cuisine_also
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
