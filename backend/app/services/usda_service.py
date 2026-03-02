import os
import httpx


async def usda_search_foods(query: str, limit: int = 7) -> list[dict]:
    usda_key = os.getenv("USDA_API_KEY")
    if not usda_key:
        return []

    url = "https://api.nal.usda.gov/fdc/v1/foods/search"

    async with httpx.AsyncClient() as client:
        r = await client.get(
            url,
            params={
                "api_key": usda_key,
                "query": query,
                "pageSize": 20,
                "dataType": ["Branded", "Survey (FNDDS)"],
            },
            timeout=12,
        )

    if r.status_code != 200:
        return []

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
            "description": (f.get("description") or "").title(),
            "brand": (f.get("brandName") or f.get("brandOwner") or "Generic").title(),
            "servingSize": f.get("servingSize"),
            "servingUnit": f.get("servingSizeUnit", "g"),
            "macros": {
                "calories": n_map.get(1008, 0),
                "carbs": n_map.get(1005, 0),
                "protein": n_map.get(1003, 0),
                "fats": round(total_fat, 2),
            },
            "extras": {
                "fiber": n_map.get(1079, 0),
                "sodium": n_map.get(1093, 0),
                "sugar": n_map.get(2000, 0),
            }
        })

    seen = set()
    unique_foods = []
    for food in foods:
        key = (food.get("description") or "").lower()
        if key and key not in seen:
            seen.add(key)
            unique_foods.append(food)

    return unique_foods[:limit]


def build_usda_context(foods: list[dict]) -> str:
    if not foods:
        return ""

    lines = []
    for f in foods[:5]:
        m = f.get("macros", {})
        e = f.get("extras", {})
        lines.append(
            f"- {f.get('description')} ({f.get('brand')}) "
            f"| {m.get('calories', 0)} kcal, P{m.get('protein', 0)} C{m.get('carbs', 0)} F{m.get('fats', 0)} "
            f"| Na {e.get('sodium', 0)}mg, Sugar {e.get('sugar', 0)}g, Fiber {e.get('fiber', 0)}g "
            f"| fdcId={f.get('fdcId')}"
        )

    return "[USDA FOOD MATCHES]\n" + "\n".join(lines)