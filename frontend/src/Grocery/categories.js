export const INGREDIENT_UNITS = new Set([
  "tsp", "teaspoon", "teaspoons",
  "tbsp", "tablespoon", "tablespoons",
  "cup", "cups",
  "oz", "ounce", "ounces",
  "fl", "floz",
  "lb", "lbs", "pound", "pounds",
  "g", "gram", "grams",
  "kg", "kilogram", "kilograms",
  "ml", "milliliter", "milliliters",
  "l", "liter", "liters",
  "pinch", "dash",
  "clove", "cloves",
  "piece", "pieces",
  "bunch", "bunches",
  "can", "cans",
  "package", "pkg", "packages",
  "slice", "slices",
  "head", "heads",
  "stalk", "stalks",
  "sprig", "sprigs",
  "handful",
]);

export function parseQtyInput(str) {
  const text = String(str || "").trim();
  if (!text) return { qty: 1, unit: "" };

  const match = text.match(/^([\d\s/.]+)\s*([a-zA-Z].*)?\s*$/);
  if (!match) return { qty: 1, unit: text };

  const numPart = match[1].trim();
  const unitPart = (match[2] || "").trim();

  const pieces = numPart.split(/\s+/);
  let total = 0;
  for (const piece of pieces) {
    if (!piece) continue;
    if (piece.includes("/")) {
      const [num, den] = piece.split("/").map((v) => Number(v));
      if (Number.isFinite(num) && Number.isFinite(den) && den > 0) {
        total += num / den;
      }
    } else {
      const value = Number(piece);
      if (Number.isFinite(value)) total += value;
    }
  }

  const qty = total > 0 ? total : 1;
  return { qty, unit: unitPart };
}

export const CATEGORY_ORDER = [
  "Produce",
  "Meat/Seafood",
  "Dairy",
  "Bakery",
  "Pantry",
  "Frozen",
  "Beverages",
  "Other",
];

export function normalizeCategory(cat) {
  const value = String(cat || "").trim();
  if (!value) return "Other";
  return CATEGORY_ORDER.includes(value) ? value : "Other";
}

function includesAny(text, keywords) {
  const haystack = ` ${String(text || "").toLowerCase()} `;
  return keywords.some((k) => haystack.includes(` ${k.toLowerCase()} `));
}

export function guessCategoryFromName(name) {
  const value = String(name || "").toLowerCase();
  if (!value) return "Other";

  if (
    includesAny(value, [
      "apple",
      "banana",
      "berry",
      "orange",
      "lemon",
      "lime",
      "grape",
      "melon",
      "lettuce",
      "spinach",
      "kale",
      "cabbage",
      "carrot",
      "broccoli",
      "onion",
      "garlic",
      "pepper",
      "tomato",
      "cucumber",
      "zucchini",
      "potato",
      "sweet potato",
      "avocado",
      "herb",
      "cilantro",
      "parsley",
      "basil",
    ])
  ) {
    return "Produce";
  }

  if (
    includesAny(value, [
      "chicken",
      "turkey",
      "beef",
      "steak",
      "pork",
      "bacon",
      "sausage",
      "ham",
      "salmon",
      "tuna",
      "shrimp",
      "fish",
      "ground beef",
      "ground turkey",
    ])
  ) {
    return "Meat/Seafood";
  }

  if (
    includesAny(value, [
      "milk",
      "cheese",
      "yogurt",
      "butter",
      "cream",
      "half-and-half",
      "sour cream",
      "cottage cheese",
      "egg",
      "eggs",
    ])
  ) {
    return "Dairy";
  }

  if (
    includesAny(value, [
      "bread",
      "bagel",
      "buns",
      "roll",
      "tortilla",
      "pita",
      "croissant",
      "muffin",
    ])
  ) {
    return "Bakery";
  }

  if (
    includesAny(value, [
      "rice",
      "pasta",
      "noodle",
      "oats",
      "oatmeal",
      "cereal",
      "flour",
      "sugar",
      "salt",
      "oil",
      "olive oil",
      "canola oil",
      "vinegar",
      "sauce",
      "ketchup",
      "mustard",
      "mayonnaise",
      "mayo",
      "spice",
      "cumin",
      "paprika",
      "cinnamon",
      "nutmeg",
      "black pepper",
      "honey",
      "broth",
      "stock",
      "bouillon",
      "beans",
      "lentil",
      "chickpea",
      "canned",
      "tomato sauce",
      "tomato paste",
      "peanut butter",
      "almond butter",
    ])
  ) {
    return "Pantry";
  }

  if (
    includesAny(value, [
      "frozen",
      "ice cream",
      "frozen vegetables",
      "frozen fruit",
      "frozen pizza",
      "frozen berries",
    ])
  ) {
    return "Frozen";
  }

  if (
    includesAny(value, [
      "juice",
      "soda",
      "coffee",
      "tea",
      "sparkling water",
      "water bottle",
      "sports drink",
      "kombucha",
    ])
  ) {
    return "Beverages";
  }

  return "Other";
}

