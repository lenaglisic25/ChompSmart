# USDA Food Data Central API integration
# moved general logic to services/usda_service.py for better separation of concerns
from fastapi import APIRouter, Query
from app.services.usda_service import usda_search_foods

router = APIRouter(prefix="/usda", tags=["usda"])


@router.get("/search")
async def search_food(query: str = Query(...)):
    return await usda_search_foods(query=query, limit=7)