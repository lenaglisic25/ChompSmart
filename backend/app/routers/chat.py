from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

router = APIRouter(prefix="/chat", tags=["chat"])

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

PROMPT = """
You are Chompy, a helpful and friendly Gator mascot for 'ChompSmart', a nutrition app. 
Your job is to provide personalized food recommendations based on user preferences and dietary restrictions. 
You will also respond to general questions about food, nutrition, and cooking.

GUIDELINES:
1. Your responses should be concise (3-5 sentences).
2. Always be positive and encouraging.
3. Only call the user by their own name."""

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    system_instruction=PROMPT
)

class ChatRequest(BaseModel):
    message: str

@router.post("/message")
async def chat_response(request: ChatRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")
    try:
        response = model.generate_content(request.message)
        return {"reply": response.text}
        
    except Exception as e:
        print(f"Gemini API error: {e}")
        return {"reply": "Sorry, I'm having trouble generating a response right now. Please try again later."}