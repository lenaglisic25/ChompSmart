import base64
import io
from PIL import Image
from fastapi import APIRouter, HTTPException, Depends
from requests import request
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
import os
import google.generativeai as genai
from dotenv import load_dotenv
import json
import re
import time
from app.database import get_db
from app.models.profile import Profile
from app.models.meals import Meal
from datetime import date

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

router = APIRouter(prefix="/chat", tags=["chat"])

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# helper function to get user profile
def get_user_context(db: Session, user_email: str) -> str:
    if not user_email: return ""

    user = db.query(Profile).filter(Profile.user_email == user_email).first()
    if not user: return ""

    def val(v): return v if v is not None else "N/A"

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
        func.date(Meal.created_at) == today
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

    return f"{profile_text}\n{log_text}"

# PROMPTS
CHAT_PROMPT = """
You are Chompy, a helpful and friendly Gator mascot for 'ChompSmart', a nutrition app.
Your job is to provide personalized food recommendations.

GUIDELINES:
1. Concise responses (3-5 sentences).
2. Be positive and encouraging.
3. Only greet the user once per conversation.

RESPONSIBILITIES:
1. Answer questions about diet, health, and food.
2. Use the User Profile and Daily Log to give specific advice.
3. You have the special ability to log meals for the user, but ONLY if they explicitly ask or confirm.

HOW TO LOG MEALS:
  1. Respond naturally confirming the action.
  2. At the very end of your message, append this exact JSON block:
     LOG_MEAL: {"name": "Food Name", "calories": 123, "protein": 10, "carbs": 20, "fats": 5, "meal_type": "Snack"}
  3. 'meal_type' options: Breakfast, Lunch, Dinner, Snack.

"""

VISION_PROMPT = """
You are Chompy. The user sent a food photo.
1. Identify the food and list all ingredients.
2. Estimate calories/macros for the serving shown (Protein, Carbs, Fat, Fiber, Sodium).
3. Concise responses (3-5 sentences).
4. Be positive and encouraging.
5. Only greet the user once per conversation.
6. End your response by asking the user if they want to log this meal and which meal slot (Breakfast, Lunch, Dinner) it belongs to.
"""

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash", 
    system_instruction=CHAT_PROMPT 
)

# MODELS
class ChatRequest(BaseModel):
    message: str
    history: list = []
    user_email: str | None = None

class ImageChatRequest(BaseModel):
    image: str
    user_email: str | None = None

# ROUTES
@router.post("/message")
async def chat_response(request: ChatRequest, db: Session = Depends(get_db)):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")

    user_context = get_user_context(db, request.user_email)

    history_str = ""
    if request.history:
        for msg in request.history:
            role = "User" if msg.get('from') == "me" else "Model"
            content = msg.get('body', '[Image Sent]')
            history_str += f"\n{role}: {content}"

    full_prompt = f"{user_context}\n{history_str}\nUser: {request.message}\nModel:"
    
    try:
        response = model.generate_content(full_prompt)
        reply_text = response.text

        # handle meal logging
        if "LOG_MEAL:" in reply_text:
            parts = reply_text.split("LOG_MEAL:", 1)
            conversation_part = parts[0].strip()
            json_part = parts[1].strip()

            try:
                json_part = json_part.replace("```json", "").replace("```", "").strip()
                meal_data = json.loads(json_part)

                if request.user_email:
                    new_meal = Meal(
                        user_email=request.user_email,
                        food_name=meal_data.get("name", "Unknown Food"),
                        calories=meal_data.get("calories", 0),
                        protein=meal_data.get("protein", 0),
                        carbs=meal_data.get("carbs", 0),
                        fats=meal_data.get("fats", 0),
                        sodium=meal_data.get("sodium", 0),
                        fiber=meal_data.get("fiber", 0),
                        meal_type=meal_data.get("meal_type", "Snack"),
                    )
                    db.add(new_meal)
                    db.commit()
                    print(f"AUTO-LOGGED: {new_meal.food_name}")

                return {"reply": conversation_part}

            except Exception as e:
                print(f"Auto-Log Error: {e}")
                return {"reply": conversation_part + " (I tried to log that, but hit a glitch!)"}
        
        return {"reply": reply_text}

    except Exception as e:
        print(f"Gemini Error: {e}")
        return {"reply": "Chompy is taking a nap. Try again!"}


@router.post("/upload")
async def analyze_image(request: ImageChatRequest, db: Session = Depends(get_db)):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")
    
    user_context = get_user_context(db, request.user_email)

    try:
        if "," in request.image:
            header, encoded = request.image.split(",", 1)
        else:
            encoded = request.image
        
        bytes_data = base64.b64decode(encoded)
        img = Image.open(io.BytesIO(bytes_data))

        final_prompt = f"{VISION_PROMPT}\n\nCONTEXT:\n{user_context}"
        
        response = model.generate_content([final_prompt, img])
        return {"reply": response.text}
    
    except Exception as e:
        print(f"Vision Error: {e}")
        return {"reply": "Oh snap! I couldn't quite make out that picture."}