from fastapi import APIRouter, HTTPException, Depends
from requests import request
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
import os
import google.generativeai as genai
from dotenv import load_dotenv
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

PROMPT = """
You are Chompy, a helpful and friendly Gator mascot for 'ChompSmart', a nutrition app. 
Your job is to provide personalized food recommendations.

GUIDELINES:
1. Concise responses (3-5 sentences).
2. Be positive and encouraging.
3. Use the User's Profile data to give specific advice (e.g. if they want to lose weight, suggest lower calorie options).
4. Only greet the user once per conversation.
5. Use the user's daily log to inform your recommendations (e.g. if they log a high-carb breakfast, suggest a lower-carb lunch).
"""

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash", 
    system_instruction=PROMPT
)

class ChatRequest(BaseModel):
    message: str
    history: list = []
    user_email: str | None = None

@router.post("/message")
async def chat_response(request: ChatRequest, db: Session = Depends(get_db)):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")

    profile_text = "[User Profile: Not Found or Not Logged In]"
    log_text = "[DAILY LOG: No meals logged today]"
    
    if request.user_email:
        user = db.query(Profile).filter(Profile.user_email == request.user_email).first()
        
        if user:
            # fetch from profile
            def val(v): return v if v is not None else "N/A"
            
            profile_text = f"""
            [CURRENT USER PROFILE DATA]
            Name: {val(user.name)}
            Birthday: {val(user.birthday_text)}
            Sex at Birth: {val(user.sex_at_birth)}
            Height: {val(user.height_text)}
            Weight: {val(user.weight_text)}
            Health Conditions: {val(user.health_conditions)} ({val(user.health_conditions_other_text)})
            Medications: {val(user.medications_text)}
            Allergies: {val(user.med_allergies_text)}
            Steps Range: {val(user.steps_range)}
            Active Days/Week: {val(user.active_days_per_week)}
            Movement Types: {val(user.movement_types)}
            
            Daily Calorie Goal: {val(user.calorie_goal)}
            TDEE (Maintenance): {val(user.tdee_male) if user.sex_at_birth == 'Male' else val(user.tdee_female)}
            Macros (Target): {val(user.protein_g)}g Protein, {val(user.carbs_g)}g Carbs, {val(user.fats_g)}g Fat
            
            Dietary Restrictions: {val(user.dietary_restrictions)}
            Cuisine Styles: {val(user.cuisine_styles)}
            Meal Types: {val(user.meal_types)}
            Cooking Skill: {val(user.cooking_skill)}
            Cooking Methods: {val(user.cooking_methods)}
            Kitchen Equipment: {val(user.kitchen_equipment)}
        
            Household Size: {val(user.household_size)}
            Household Ages: {val(user.household_age_groups)}
            Grocery Budget: {val(user.weekly_grocery_budget)}
            Grocery Stores: {val(user.grocery_stores)}
            Food Assistance: {val(user.food_help_programs)} ({val(user.food_help_other_text)})
            Internet/Tech: {val(user.internet_access)} | {val(user.technology_devices)}
            [END PROFILE DATA]
            """

            # fetch from daily log
            user_goal = user.calorie_goal if user.calorie_goal else 2000
            today = date.today()
            
            todays_meals = db.query(Meal).filter(
                Meal.user_email == request.user_email,
                func.date(Meal.created_at) == today
            ).all()

            if todays_meals:
                total_cals = sum(m.calories for m in todays_meals if m.calories)
                total_prot = sum(m.protein for m in todays_meals if m.protein)
                total_carbs = sum(m.carbs for m in todays_meals if m.carbs)
                total_fat = sum(m.fats for m in todays_meals if m.fats)
                
                remaining = user_goal - total_cals
                
                meal_list = ", ".join([f"{m.food_name} ({m.meal_type})" for m in todays_meals])

                log_text = f"""
                Foods Eaten: {meal_list}
                
                -- TOTALS SO FAR --
                Calories: {int(total_cals)} / {user_goal} (Remaining: {int(remaining)})
                Protein: {int(total_prot)}g
                Carbs: {int(total_carbs)}g
                Fat: {int(total_fat)}g
                """
        else:
            print(f"[DEBUG] No profile found in DB for email: {request.user_email}")
    else:
        print("[DEBUG] Warning: Frontend sent 'null' email.")

    history_str = ""
    if request.history:
        for msg in request.history:
            role = "User" if msg['from'] == "me" else "Model"
            history_str += f"\n{role}: {msg['body']}"
    full_prompt = f"{profile_text}\n{log_text}\n{history_str}\nUser: {request.message}\nModel:"    
    
    retries = 3
    for _ in range(retries): 
        try:
            response = model.generate_content(full_prompt)
            return {"reply": response.text}
        except Exception as e:
            if "429" in str(e) or "ResourceExhausted" in str(e):
                time.sleep(2)
            else:
                break
    return {"reply": "Chompy is taking a nap. Try again!"}