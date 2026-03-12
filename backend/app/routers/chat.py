import base64
import io
import json
import os
from datetime import date
from pathlib import Path

from PIL import Image
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

import google.generativeai as genai
from dotenv import load_dotenv

from app.database import get_db
from app.models.profile import Profile
from app.models.meals import Meal
from app.models.grocery import GroceryItem
from app.services.usda_service import usda_search_foods, build_usda_context


# Always load backend/.env no matter where server is started from
env_path = Path(__file__).resolve().parents[2] / ".env"  # backend/.env
load_dotenv(env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

router = APIRouter(prefix="/chat", tags=["chat"])

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def _as_float(v, default=0.0) -> float:
    try:
        if v is None:
            return float(default)
        return float(v)
    except (TypeError, ValueError):
        return float(default)


def get_user_context(db: Session, user_email: str, favorite_recipes: list = None, grocery_list: list = None) -> str:
    if not user_email:
        return ""

    user = db.query(Profile).filter(Profile.user_email == user_email).first()
    if not user:
        return ""

    def val(v):
        return v if v is not None else "N/A"

    profile_text = f"""
    [CURRENT USER PROFILE DATA]
    Name: {val(user.name)}
    Dietary Restrictions: {val(user.dietary_restrictions)}
    Daily Calorie Goal: {val(user.calorie_goal)}
    Macros (Target): {val(user.protein_g)}g Protein, {val(user.carbs_g)}g Carbs, {val(user.fats_g)}g Fat
    Health Conditions: {val(user.health_conditions)} ({val(user.health_conditions_other_text)})

    Cooking Methods: {val(user.cooking_methods)}
    Cooking Skill: {val(user.cooking_skill)}
    Kitchen Equipment: {val(user.kitchen_equipment)}
    Household Size: {val(user.household_size)}
    Household Ages: {val(user.household_age_groups)}

    Grocery Budget: {val(user.weekly_grocery_budget)}
    Grocery Stores: {val(user.grocery_stores)}
    Food Assistance: {val(user.food_help_programs)} ({val(user.food_help_other_text)})
    """

    user_goal = user.calorie_goal if user.calorie_goal else 2000
    today = date.today()

    todays_meals = db.query(Meal).filter(
        Meal.user_email == user_email,
        func.date(Meal.created_at, "localtime") == today,
    ).all()

    log_text = "[DAILY LOG: No meals logged today]"
    if todays_meals:
        total_cals = sum(m.calories for m in todays_meals if m.calories)
        meal_list = ", ".join([f"{m.food_name}" for m in todays_meals])
        log_text = f"""
        [DAILY LOG]
        Foods Eaten: {meal_list}
        Calories So Far: {int(total_cals)} / {user_goal}
        """

    grocery_text = "[GROCERY LIST: Empty]"
    if grocery_list:
        to_buy = [i['name'] for i in grocery_list if not i['purchased']]
        already_have = [i['name'] for i in grocery_list if i['purchased']]
        
        grocery_text = "[GROCERY LIST]\n"
        if to_buy:
            grocery_text += f"Items user still needs to buy: {', '.join(to_buy)}\n"
        if already_have:
            grocery_text += f"Items user already has/purchased: {', '.join(already_have)}"

    fav_text = "[FAVORITE RECIPES: None saved]"
    if favorite_recipes:
        f_list = ", ".join(favorite_recipes)
        fav_text = f"[FAVORITE RECIPES]\nSaved recipes: {f_list}"

    return f"{profile_text}\n{log_text}\n{grocery_text}\n{fav_text}"


CHAT_PROMPT = """
You are Chompy, a helpful and friendly Gator mascot for 'ChompSmart', a nutrition app.

CRITICAL TONE & READING LEVEL:
1. Speak at a 5th-grade reading level using short, simple sentences.
2. Keep a positive, friendly Gator persona.
3. If the user asks for a grocery list or ingredients, you MUST use a bulleted list format.

GROCERY LIST RULES:
1. ONLY comment on grocery items when the user explicitly asks about their list or ingredients for a meal.
2. Do not mention unrelated items on their list (e.g., if they ask about a stir-fry, do not mention the rice on their list unless they ask).
3. Clearly state what they already have and what they still need to buy based on the provided context.

RESPONSIBILITIES:
1. Answer questions about diet, health, and food simply.
2. Use the User Profile and Daily Log to give specific advice.
3. You can log meals or add groceries only if the user confirms.

HOW TO LOG MEALS:
  Append: LOG_MEAL: {"name":"Food Name","calories":123,"protein":10,"carbs":20,"fats":5,"fiber":2,"sodium":300,"sugar":4,"meal_type":"Snack"}

HOW TO ADD GROCERIES:
  Append: ADD_GROCERIES: ["Item 1", "Item 2"]
"""

VISION_PROMPT = """
You are Chompy. The user sent a food photo.

CRITICAL TONE & READING LEVEL:
1. Speak at a 5th-grade reading level. 
2. Use short, simple sentences.
3. Keep a positive, encouraging Gator persona.

RESPONSIBILITIES:
1. Identify the food and list all ingredients.
2. Estimate calories/macros for the serving shown (Protein, Carbs, Fat, Fiber, Sodium, Sugar).
3. Concise responses (3-5 sentences maximum).
4. Only greet the user once per conversation.
5. End your response by asking the user if they want to log this meal and which meal slot (Breakfast, Lunch, Dinner) it belongs to.
"""

ADJUST_PROMPT = """
You are Chompy, a friendly Gator nutritionist and chef.
The user wants to make the following recipe, but you need to adjust it to fit their specific dietary restrictions.

CRITICAL TONE & READING LEVEL:
1. Speak at a 5th-grade reading level. 
2. Use short, simple sentences.

RESPONSIBILITIES:
1. Rewrite the ingredients list with safe substitutions.
2. Update the instructions if the substitutions change the cooking method. Keep steps short and clear.
3. Briefly explain why you made the changes to keep it healthy and compliant.
"""

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    system_instruction=CHAT_PROMPT
)


class ChatRequest(BaseModel):
    message: str
    history: list = Field(default_factory=list)
    user_email: str | None = None
    favorites: list = Field(default_factory=list)
    groceries: list = Field(default_factory=list)


class ImageChatRequest(BaseModel):
    image: str
    user_email: str | None = None


class RecipeAdjustRequest(BaseModel):
    user_email: str
    original_recipe_text: str


@router.post("/message")
async def chat_response(request: ChatRequest, db: Session = Depends(get_db)):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")

    user_context = get_user_context(db, request.user_email, request.favorites, request.groceries)

    history_str = ""
    if request.history:
        for msg in request.history:
            role = "User" if msg.get("from") == "me" else "Model"
            content = msg.get("body", "[Image Sent]")
            history_str += f"\n{role}: {content}"

    foods = await usda_search_foods(request.message, limit=7)
    food_context = build_usda_context(foods)

    full_prompt = f"{user_context}\n{food_context}\n{history_str}\nUser: {request.message}\nModel:"

    try:
        response = model.generate_content(full_prompt)
        reply_text = response.text or ""
        conversation_part = reply_text
        added_groceries = []

        if "ADD_GROCERIES:" in reply_text:
            parts = reply_text.split("ADD_GROCERIES:", 1)
            conversation_part = parts[0].strip()
            json_part = parts[1].split("LOG_MEAL:")[0].strip()
            try:
                json_part = json_part.replace("```json", "").replace("```", "").strip()
                added_groceries = json.loads(json_part)
            except Exception:
                pass

        if "LOG_MEAL:" in reply_text:
            parts = reply_text.split("LOG_MEAL:", 1)
            if "LOG_MEAL:" in conversation_part:
                conversation_part = parts[0].strip()
            
            json_part = parts[1].split("ADD_GROCERIES:")[0].strip()
            try:
                json_part = json_part.replace("```json", "").replace("```", "").strip()
                meal_data = json.loads(json_part)

                if request.user_email:
                    sodium_val = meal_data.get("sodium", meal_data.get("sodium_mg"))
                    fiber_val = meal_data.get("fiber", meal_data.get("fiber_g"))
                    sugar_val = meal_data.get("sugar", meal_data.get("sugars", meal_data.get("sugars_g")))

                    new_meal = Meal(
                        user_email=request.user_email,
                        food_name=meal_data.get("name", "Unknown Food"),
                        calories=_as_float(meal_data.get("calories", 0)),
                        protein=_as_float(meal_data.get("protein", 0)),
                        carbs=_as_float(meal_data.get("carbs", 0)),
                        fats=_as_float(meal_data.get("fats", 0)),
                        fiber=_as_float(fiber_val, 0),
                        sodium=_as_float(sodium_val, 0),
                        sugar=_as_float(sugar_val, 0),
                        meal_type=meal_data.get("meal_type", "Snack"),
                    )
                    db.add(new_meal)
                    db.commit()
            except Exception:
                conversation_part += " (I tried to log that, but hit a glitch!)"

        return {"reply": conversation_part, "added_groceries": added_groceries}

    except Exception:
        return {"reply": "Chompy is taking a nap. Try again!"}


@router.post("/upload")
async def analyze_image(request: ImageChatRequest, db: Session = Depends(get_db)):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")

    user_context = get_user_context(db, request.user_email)

    try:
        if "," in request.image:
            _, encoded = request.image.split(",", 1)
        else:
            encoded = request.image

        bytes_data = base64.b64decode(encoded)
        img = Image.open(io.BytesIO(bytes_data))

        final_prompt = f"{VISION_PROMPT}\n\nCONTEXT:\n{user_context}"
        response = model.generate_content([final_prompt, img])
        return {"reply": response.text}

    except Exception:
        return {"reply": "Oh snap! I couldn't quite make out that picture."}


@router.post("/adjust-recipe")
async def adjust_recipe(request: RecipeAdjustRequest, db: Session = Depends(get_db)):
    user = db.query(Profile).filter(Profile.user_email == request.user_email).first()
    restrictions = user.dietary_restrictions if user else "None"

    full_prompt = f"""
{ADJUST_PROMPT}

USER RESTRICTIONS: {restrictions}

ORIGINAL RECIPE:
{request.original_recipe_text}
"""

    response = model.generate_content(full_prompt)
    return {"adjusted_recipe": response.text}