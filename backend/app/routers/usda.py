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

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail="Failed to retrieve USDA data")

    data = r.json()
    list_of_foods = data.get("foods", [])

    foods = []

    for f in list_of_foods:
        nutrient_map = {}
        for n in f.get("foodNutrients", []):
            n_id = n.get("nutrientId")
            n_val = n.get("value", n.get("amount", 0))
            
            if n_id is not None:
                nutrient_map[n_id] = n_val

        total_fat = nutrient_map.get(1004, 0)

        if total_fat == 0:
            sat_fat = nutrient_map.get(1258, 0)
            mono_fat = nutrient_map.get(1292, 0)
            poly_fat = nutrient_map.get(1293, 0)
            trans_fat = nutrient_map.get(1257, 0)
            
            total_fat = sat_fat + mono_fat + poly_fat + trans_fat

        foods.append({
            "description": f.get("description"),
            "brand": f.get("brandName", "Generic"), 
            
            "calories": nutrient_map.get(1008, 0),
            
            "carbohydrates": nutrient_map.get(1005, 0),
            "protein": nutrient_map.get(1003, 0),
            "fats": total_fat,
            
            "fiber": nutrient_map.get(1079, 0),
            "sodium": nutrient_map.get(1093, 0),
        })

    return foods