import os
import requests
from fastapi import APIRouter, HTTPException, Query
import httpx

router = APIRouter(prefix="/usda", tags=["usda"])

USDA_API_KEY = os.getenv("USDA_API_KEY")

@router.get("/search")
async def search_food(query: str = Query(...)):
    url = "https://api.nal.usda.gov/fdc/v1/foods/search"
    
    async with httpx.AsyncClient() as client:
        r = await client.get(url, params={
            "api_key": USDA_API_KEY,
            "query": query,
            "pageSize": 5,
            "dataType": ["Branded", "Survey (FNDDS)"]
        })

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail="USDA API unreachable")

    data = r.json()
    foods = []

    for f in data.get("foods", []):
        n_map = {n.get("nutrientId"): n.get("value", 0) for n in f.get("foodNutrients", [])}

        total_fat = n_map.get(1004) or (
            n_map.get(1258, 0) + n_map.get(1292, 0) + 
            n_map.get(1293, 0) + n_map.get(1257, 0)
        )

        foods.append({
            "fdcId": f.get("fdcId"),
            "description": f.get("description").title(),
            "brand": (f.get("brandName") or f.get("brandOwner") or "Generic").title(),
            "servingSize": f.get("servingSize"),
            "servingUnit": f.get("servingSizeUnit", "g"),
            "macros": {
                "calories": n_map.get(1008, 0),
                "carbs": n_map.get(1005, 0),
                "protein": n_map.get(1003, 0),
                "fats": round(total_fat, 2)
            },
            "extras": {
                "fiber": n_map.get(1079, 0),
                "sodium": n_map.get(1093, 0)
            }
        })

    return foods