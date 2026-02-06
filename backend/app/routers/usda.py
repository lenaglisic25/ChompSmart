import os
import requests
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/usda", tags=["usda"])

USDA_API_KEY = os.getenv("USDA_API_KEY")

@router.get("/search")
def search_food(query: str = Query(...)):
    url = "https://api.nal.usda.gov/fdc/v1/foods/search"
    
    r = requests.get(url, params={
        "api_key": USDA_API_KEY,
        "query": query,
        "pageSize": 5,
    })

    data = r.json()
    foods = []

    for f in data.get("foods", []):
        nutrients = {n["nutrientName"]: n["value"] for n in f.get("foodNutrients", [])}

        foods.append({
            "description": f.get("description"),
            "calories": nutrients.get("Energy", 0),
            "protein": nutrients.get("Protein", 0),
            "carbohydrates": nutrients.get("Carbohydrate, by difference", 0),
            "fat": nutrients.get("Total lipid (fat)", 0),        })

    return foods