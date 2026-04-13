import os
import httpx

_http_client = httpx.AsyncClient(timeout=10.0)

def _strip_plural(text: str) -> str:
    t = text.lower().strip()
    if t.endswith('s') and not t.endswith('ss') and not t.endswith('us'):
        return t[:-1]
    return t

async def usda_search_foods(query: str, limit: int = 7) -> list[dict]:
    usda_key = os.getenv("USDA_API_KEY")
    if not usda_key: return []

    query = query.strip()
    url = "https://api.nal.usda.gov/fdc/v1/foods/search"

    async def fetch_data(search_term):
        if " " in search_term.strip():
            data_types = ["Branded", "Survey (FNDDS)", "Foundation", "SR Legacy"]
        else:
            data_types = ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"]
            
        try:
            r = await _http_client.get(
                url,
                params={
                    "api_key": usda_key,
                    "query": search_term,
                    "pageSize": 50, 
                    "dataType": data_types,
                }
            )
            return r.json().get("foods", []) if r.status_code == 200 else []
        except Exception:
            return []

    raw_foods = await fetch_data(query)
    if not raw_foods and query.strip().lower().endswith('s'):
        singular_query = _strip_plural(query)
        if singular_query != query.lower().strip():
            raw_foods = await fetch_data(singular_query)

    if not raw_foods:
        return []

    foods = []
    for f in raw_foods:
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
                "calories": n_map.get(1008) or n_map.get(2047) or n_map.get(2048, 0),
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

    query_lower = query.lower().strip()
    q_base = _strip_plural(query_lower)

    def sort_score(food):
        food_desc = food["description"].lower()
        brand = food.get("brand", "").lower()

        primary_name = food_desc.split(',')[0].strip()
        p_base = _strip_plural(primary_name)

        score = 5

        if p_base == q_base and brand == "generic":
            score = -2 if ("raw" in food_desc or "fresh" in food_desc) else -1
        elif " " in query_lower and query_lower in brand:
            score = 0
        elif p_base == q_base:
            score = 1 if "plain" in food_desc else 2
        elif food_desc.startswith(q_base):
            score = 3
        elif q_base in food_desc:
            score = 4

        return (score, len(food_desc), food_desc)

    unique_foods.sort(key=sort_score)

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