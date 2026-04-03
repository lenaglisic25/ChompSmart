import React, { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import "./Learn.css";

import videosData from "../data/videos.json";
import { useFavorites } from "../context/FavoritesContext";
import { useGrocery } from "../grocery/GroceryContext";
import { guessCategoryFromName, INGREDIENT_UNITS } from "../grocery/categories";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";

const RECIPE_IMAGE_PLACEHOLDER = `${import.meta.env.BASE_URL}recipe-bowl-placeholder.svg`;

function recipeMatchesSearch(r, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    r.title.toLowerCase().includes(q) ||
    r.category.toLowerCase().includes(q) ||
    (r.cuisine || "").toLowerCase().includes(q) ||
    (r.dietary_tags || []).some((t) => t.toLowerCase().includes(q)) ||
    canonicalEquipmentTagsList(r.equipment_tags).some((t) =>
      t.toLowerCase().includes(q)
    ) ||
    (r.ingredients || "").toLowerCase().includes(q)
  );
}

function videoMatchesSearch(v, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    (v.title || "").toLowerCase().includes(q) ||
    (v.source || "").toLowerCase().includes(q) ||
    (v.category || "").toLowerCase().includes(q) ||
    (v.program || "").toLowerCase().includes(q)
  );
}

function recipeMatchesFilters(r, activeFilters) {
  if (activeFilters.length === 0) return true;

  for (const f of activeFilters) {
    const colon = f.indexOf(":");
    const type = f.slice(0, colon);
    const value = f.slice(colon + 1);

    if (type === "d") {
      const tags = (r.dietary_tags || []).map((t) => t.toLowerCase());
      if (!tags.includes(value.toLowerCase())) return false;
    } else if (type === "e") {
      const want = canonicalEquipmentTag(value) || value;
      const tags = canonicalEquipmentTagsList(r.equipment_tags).map((t) =>
        t.toLowerCase()
      );
      if (tags.includes(want.toLowerCase())) return false;
    } else if (type === "m") {
      if (r.category !== value) return false;
    } else if (type === "c") {
      const keys = cuisineCanonicalKeysFromString(r.cuisine || "");
      const want = filterCuisineKeysFromChip(value);
      if (!want.length) return false;
      for (const w of want) {
        if (!keys.has(w)) return false;
      }
    } else if (type === "t") {
      const mins = parseFloat(r.minutes);
      if (isNaN(mins) || mins > parseFloat(value)) return false;
    } else if (type === "rec") {
      if (value === "recommended" && !r.recommended) return false;
    }
  }

  return true;
}

const DIETARY_OPTIONS = [
  "Dairy-free",
  "Egg-free",
  "Gluten-free",
  "Keto",
  "Low-carb",
  "Low-fat",
  "Low-salt",
  "Low-sugar",
  "No seafood",
  "Nut-free",
  "Paleo",
  "Soy-free",
  "Vegan",
  "Vegetarian",
];

const TIME_FILTERS = [
  { id: "t:20", label: "Under 20 min" },
  { id: "t:30", label: "Under 30 min" },
  { id: "t:45", label: "Under 45 min" },
];

function shortCuisineLabel(cuisine) {
  return cuisine.replace(/ \(.*\)$/, "").replace(" & barbecue", "").trim();
}

function splitTopLevelCuisineSegments(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];

  const segments = [];
  let depth = 0;
  let cur = "";

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);

    if ((ch === "," || ch === ";") && depth === 0) {
      if (cur.trim()) segments.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }

  if (cur.trim()) segments.push(cur.trim());
  return segments;
}

function isJunkCuisineLeaf(lower) {
  const t = lower
    .replace(/\.$/, "")
    .replace(/^[("'\s]+|[)"'\s]+$/g, "")
    .trim();
  if (!t) return true;
  if (/^etc\.?$/i.test(t)) return true;
  return false;
}

function tidyCuisineLeaf(s) {
  let t = String(s || "").trim();
  t = t.replace(/^[),.;]+|[),.;]+$/g, "").trim();
  t = t.replace(/\s+/g, " ");
  t = shortCuisineLabel(t);
  t = t.replace(/^[("'\s]+|[)"'\s]+$/g, "").trim();
  return t;
}

function normalizeForDelimSplit(s) {
  return String(s || "").replace(/\s+etc\.?\s*$/i, "").trim();
}

function splitOnAmpersandAndSlash(seg) {
  const t = tidyCuisineLeaf(seg);
  if (!t) return [];
  const chunks = t
    .split(/\s*\/\s*/)
    .flatMap((p) => p.split(/\s+&\s+/))
    .map((x) => tidyCuisineLeaf(x))
    .filter((x) => x && !isJunkCuisineLeaf(x.toLowerCase()));
  return chunks.length ? chunks : [];
}

function expandCuisineSegment(seg) {
  const trimmed = String(seg || "").trim();
  if (!trimmed) return [];

  const paren = trimmed.match(/^(.+?)\s*\(([^)]*)\)\s*$/);
  if (paren) {
    const label = tidyCuisineLeaf(paren[1]);
    const innerRaw = normalizeForDelimSplit(paren[2].trim());
    const innerParts = innerRaw
      ? innerRaw.split(/[;,]+/).map((x) => tidyCuisineLeaf(x))
      : [];

    const out = [];
    if (label && !isJunkCuisineLeaf(label.toLowerCase())) out.push(label);
    for (const p of innerParts) {
      if (p && !isJunkCuisineLeaf(p.toLowerCase())) out.push(p);
    }
    return out;
  }

  return splitOnAmpersandAndSlash(trimmed);
}

const CUISINE_CANONICAL_KEY_OVERRIDES = new Map(
  Object.entries({
    "mexican & tex-mex": "mexican",
    "mexican/tex-mex": "mexican",
    "mexican-american": "mexican",
    "tex-mex": "mexican",
    texmex: "mexican",
    "italian-american": "italian",
    "french-inspired": "french",
    "cajun/southern": "southern",
    "southern & barbecue": "southern",
    barbecue: "southern",
    "cuban & latin american": "latin american",
    "latin american": "latin american",
  })
);

function normalizeKeyForLookup(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function leafToCanonicalKey(leaf) {
  const tidied = tidyCuisineLeaf(leaf);
  if (!tidied) return null;

  const lookup = normalizeKeyForLookup(tidied);
  if (CUISINE_CANONICAL_KEY_OVERRIDES.has(lookup)) {
    return CUISINE_CANONICAL_KEY_OVERRIDES.get(lookup);
  }

  const simplified = lookup
    .replace(/[^a-z0-9\s-]/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (CUISINE_CANONICAL_KEY_OVERRIDES.has(simplified)) {
    return CUISINE_CANONICAL_KEY_OVERRIDES.get(simplified);
  }

  if (isJunkCuisineLeaf(lookup) || isJunkCuisineLeaf(simplified)) return null;
  if (!simplified) return null;

  return simplified.replace(/\s+/g, " ");
}

const CUISINE_KEY_DISPLAY = new Map(
  Object.entries({
    mexican: "Mexican",
    italian: "Italian",
    french: "French",
    southern: "Southern",
    american: "American",
    mediterranean: "Mediterranean",
    asian: "Asian",
    caribbean: "Caribbean",
    indian: "Indian",
    german: "German",
    chinese: "Chinese",
    japanese: "Japanese",
    korean: "Korean",
    thai: "Thai",
    vietnamese: "Vietnamese",
    turkish: "Turkish",
    greek: "Greek",
    brazilian: "Brazilian",
    "middle eastern": "Middle Eastern",
    "native american": "Native American",
    "central american": "Central American",
    "latin american": "Latin American",
    scottish: "Scottish",
    "puerto rican": "Puerto Rican",
    jamaican: "Jamaican",
    other: "Other",
    cuban: "Cuban",
  })
);

function canonicalKeyToDisplay(key) {
  if (!key) return "";
  if (CUISINE_KEY_DISPLAY.has(key)) return CUISINE_KEY_DISPLAY.get(key);

  return key
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function cuisineCanonicalKeysFromString(raw) {
  const keys = new Set();
  for (const top of splitTopLevelCuisineSegments(raw)) {
    for (const leaf of expandCuisineSegment(top)) {
      const k = leafToCanonicalKey(leaf);
      if (k) keys.add(k);
    }
  }
  return keys;
}

function filterCuisineKeysFromChip(label) {
  const direct = normalizeKeyForLookup(label);

  if (CUISINE_CANONICAL_KEY_OVERRIDES.has(direct)) {
    return [CUISINE_CANONICAL_KEY_OVERRIDES.get(direct)];
  }

  for (const [k, disp] of CUISINE_KEY_DISPLAY.entries()) {
    if (disp.toLowerCase() === direct) return [k];
  }

  const parsed = [...cuisineCanonicalKeysFromString(label)];
  if (parsed.length) return parsed;

  const fb = normalizeKeyForLookup(label)
    .replace(/[^a-z0-9\s-]/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return fb ? [fb] : [];
}

function recipeSourceHref(url) {
  let s = String(url || "")
    .trim()
    .replace(/\r/g, "")
    .replace(/^["'\s]+|["'\s]+$/g, "");

  if (!s) return "";

  const withScheme = /^https?:\/\//i.test(s)
    ? s
    : `https://${s.replace(/^\/+/, "")}`;

  try {
    const u = new URL(withScheme);
    const h = u.hostname.toLowerCase();

    if (h === "www.cookbooks.com" || h === "cookbooks.com") {
      u.protocol = "https:";
      u.hostname = "cookbooks.com";
      return u.href;
    }

    return u.href;
  } catch {
    return withScheme;
  }
}

function resolvedRecipePhotoUrl(rawUrl, recipe) {
  const t = String(rawUrl || "").trim();
  if (!t) return "";

  try {
    const u = new URL(t);
    const host = u.hostname.toLowerCase();

    if (host === "source.unsplash.com") {
      const seed =
        String(recipe?.slug || recipe?.title || "r")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "")
          .slice(0, 48) || "recipe";
      return `https://picsum.photos/seed/${seed}/400/300`;
    }
  } catch {
    return t;
  }

  return t;
}

function getFilterLabel(id) {
  const colon = id.indexOf(":");
  const type = id.slice(0, colon);
  const value = id.slice(colon + 1);

  if (type === "t") return `Under ${value} min`;
  if (type === "e") return `No ${value}`;
  if (type === "rec" && value === "recommended") return "Recommended";

  return value;
}

const EQUIPMENT_NORM_DROP = new Set(["basic kitchen tools", "mixing bowl"]);

function canonicalEquipmentTag(raw) {
  const t = String(raw || "").trim();
  if (!t) return null;

  const lower = t.toLowerCase().replace(/\s+/g, " ").trim();
  if (EQUIPMENT_NORM_DROP.has(lower)) return null;

  if (
    lower === "oven (conventional)" ||
    lower === "oven" ||
    lower === "conventional oven"
  ) {
    return "Oven";
  }

  if (
    lower === "refrigerator / fridge" ||
    lower === "refrigerator" ||
    lower === "fridge"
  ) {
    return "Refrigerator";
  }

  if (
    lower === "stove / range / stovetop" ||
    lower === "stovetop" ||
    lower === "stove" ||
    lower === "range"
  ) {
    return "Stovetop";
  }

  if (
    lower === "skillet" ||
    lower === "saucepan" ||
    lower === "frying pan" ||
    lower === "pots & pans" ||
    lower === "pots and pans"
  ) {
    return "Pots & Pans";
  }

  return t;
}

function canonicalEquipmentTagsList(tags) {
  const arr = Array.isArray(tags) ? tags : [];
  const out = [];
  const seen = new Set();

  for (const raw of arr) {
    const c = canonicalEquipmentTag(raw);
    if (!c) continue;
    const k = c.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }

  return out;
}

const EQUIPMENT_TAGS = [
  "Air Fryer",
  "Food Processor",
  "Pressure Cooker / Instant Pot",
  "Toaster Oven",
  "Rice Cooker",
  "Stand Mixer",
  "Slow Cooker",
  "Blender",
  "Cutting Board",
  "Knives (explicit mention)",
  "Oven",
  "Pots & Pans",
  "Microwave",
  "Refrigerator",
  "Stovetop",
];

function equipmentTagsFromProfileKitchenEquipment(kitchenEquipment) {
  const list = Array.isArray(kitchenEquipment) ? kitchenEquipment : [];
  const map = {
    "Air-fryer": "Air Fryer",
    Blender: "Blender",
    "Cutting board": "Cutting Board",
    "Food processor": "Food Processor",
    "Good set of knives": "Knives (explicit mention)",
    Oven: "Oven",
    "Pots and pans": "Pots & Pans",
    "Pressure cooker or Instapot": "Pressure Cooker / Instant Pot",
    Microwave: "Microwave",
    "Toaster oven": "Toaster Oven",
    Refrigerator: "Refrigerator",
    "Rice cooker": "Rice Cooker",
    "Slow cooker (crock-pot)": "Slow Cooker",
    "Stand mixer": "Stand Mixer",
    "Stove or range": "Stovetop",
  };

  const set = new Set();
  for (const item of list) {
    const tag = map[item];
    if (tag) set.add(tag);
  }

  return set;
}

function parseIngredientLabel(raw) {
  const text = String(raw || "").trim();
  if (!text) return { name: "", qty: 1, unit: "" };

  const match = text.match(/^([\d\s/.]+)\s+(.+)$/);
  if (!match) return { name: text, qty: 1, unit: "" };

  const qtyPart = match[1].trim();
  const rest = match[2].trim();

  const pieces = qtyPart.split(/\s+/);
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

  const words = rest.split(/\s+/);
  const firstWord = words[0].toLowerCase().replace(/[.,]$/, "");

  if (INGREDIENT_UNITS.has(firstWord)) {
    const name = words.slice(1).join(" ").trim() || rest;
    return { name, qty, unit: firstWord };
  }

  return { name: rest, qty, unit: "" };
}

export default function Learn() {
  const [tab, setTab] = useState("recipes");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const { isFavorite, toggleFavorite, favoritesList } = useFavorites();

  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipesError, setRecipesError] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [chompyLoading, setChompyLoading] = useState(false);
  const [chompyResponse, setChompyResponse] = useState(null);

  const [selectedVideo, setSelectedVideo] = useState(null);

  const { items, addItem, removeItem } = useGrocery();

  let userEmail = null;
  try {
    userEmail = localStorage.getItem("currentUserEmail");
  } catch (_) {
    userEmail = null;
  }

  function switchTab(newTab) {
    setTab(newTab);
    setSearchQuery("");
    setShowFilters(false);
  }

  async function triggerResourceBadge() {
    if (!userEmail) return;
    try {
      await fetch(`${API_BASE}/badges/trigger/resource`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: userEmail }),
      });
    } catch (err) {
      console.error("Resource badge trigger failed:", err);
    }
  }

  async function triggerRecipeBadge() {
    if (!userEmail) return;
    try {
      await fetch(`${API_BASE}/badges/trigger/recipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: userEmail }),
      });
    } catch (err) {
      console.error("Recipe badge trigger failed:", err);
    }
  }

  function openVideoWithBadge(video) {
    triggerResourceBadge();
    setSelectedVideo(video);
  }

  function openRecipeWithBadge(recipe) {
    triggerRecipeBadge();
    setSelectedRecipe(recipe);
  }

  function toggleFilter(id) {
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }

  useEffect(() => {
    if (!userEmail) return;

    fetch(`${API_BASE}/profile/${encodeURIComponent(userEmail)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const restrictions = data?.dietary_restrictions;
        const next = [];

        if (Array.isArray(restrictions) && restrictions.length > 0) {
          for (const r of restrictions) next.push(`d:${r}`);
        }

        const available = equipmentTagsFromProfileKitchenEquipment(
          data?.kitchen_equipment
        );

        for (const tag of EQUIPMENT_TAGS) {
          if (!available.has(tag)) next.push(`e:${tag}`);
        }

        if (next.length > 0) setActiveFilters(next);
      })
      .catch(() => {});
  }, [userEmail]);

  useEffect(() => {
    if (tab !== "recipes") return;

    setRecipesLoading(true);
    setRecipesError(null);

    fetch(`${API_BASE}/recipes`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load recipes");
        return res.json();
      })
      .then((data) => {
        const list = data.recipes != null ? data.recipes : [];
        setRecipes(list);
      })
      .catch((err) => {
        setRecipesError(err.message);
        setRecipes([]);
      })
      .finally(() => {
        setRecipesLoading(false);
      });
  }, [tab]);

  function ingredientInList(parsedName, category) {
    return items.some(
      (x) =>
        String(x.name || "").trim().toLowerCase() === parsedName.toLowerCase() &&
        String(x.category || "Other") === category &&
        !x.purchased
    );
  }

  function handleIngredientToggle(rawLabel) {
    const label = String(rawLabel || "").trim();
    if (!label) return;

    const parsed = parseIngredientLabel(label);
    const category = guessCategoryFromName(parsed.name);

    const match = items.find(
      (x) =>
        String(x.name || "").trim().toLowerCase() ===
          parsed.name.toLowerCase() &&
        String(x.category || "Other") === category &&
        !x.purchased
    );

    if (match) {
      removeItem(match.id);
    } else {
      addItem(parsed.name, parsed.qty, category, parsed.unit);
    }
  }

  function handleToggleAllIngredients(rawIngredients) {
    const ingredients = rawIngredients
      .map((x) => String(x || "").trim())
      .filter(Boolean);

    if (ingredients.length === 0) return;

    const allSelected = ingredients.every((label) => {
      const parsed = parseIngredientLabel(label);
      const category = guessCategoryFromName(parsed.name);
      return ingredientInList(parsed.name, category);
    });

    if (allSelected) {
      ingredients.forEach((label) => {
        const parsed = parseIngredientLabel(label);
        const category = guessCategoryFromName(parsed.name);
        const match = items.find(
          (x) =>
            String(x.name || "").trim().toLowerCase() ===
              parsed.name.toLowerCase() &&
            String(x.category || "Other") === category &&
            !x.purchased
        );
        if (match) removeItem(match.id);
      });
    } else {
      ingredients.forEach((label) => {
        const parsed = parseIngredientLabel(label);
        const category = guessCategoryFromName(parsed.name);
        if (!ingredientInList(parsed.name, category)) {
          addItem(parsed.name, parsed.qty, category, parsed.unit);
        }
      });
    }
  }

  async function handleAskChompy(recipe) {
    if (!recipe || !userEmail) return;

    setChompyLoading(true);
    setChompyResponse(null);

    try {
      const res = await fetch(`${API_BASE}/chat/adjust-recipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: userEmail,
          original_recipe_text: `Title: ${recipe.title}\nIngredients: ${recipe.ingredients}\nSteps: ${recipe.steps}`,
        }),
      });

      const data = await res.json();
      setChompyResponse(data.adjusted_recipe);
    } catch (err) {
      setChompyResponse("Error contacting Chompy.");
    } finally {
      setChompyLoading(false);
    }
  }

  function getRecipeImageUrl(recipe) {
    if (!recipe) return RECIPE_IMAGE_PLACEHOLDER;

    const remote = (recipe.photo_url || "").trim();
    if (remote && /^https?:\/\//i.test(remote)) {
      return resolvedRecipePhotoUrl(remote, recipe);
    }

    if (!recipe.image_filename) return RECIPE_IMAGE_PLACEHOLDER;

    const encoded = encodeURIComponent(recipe.image_filename);
    return `${API_BASE}/recipes/images/${encoded}`;
  }

  function recipeHasRenderableImage(recipe) {
    if (!recipe) return false;

    const remote = (recipe.photo_url || "").trim();
    if (remote && /^https?:\/\//i.test(remote)) return true;

    return Boolean(recipe.image_filename);
  }

  function handleRecipeImageError(e) {
    const el = e.currentTarget;
    el.onerror = null;
    el.src = RECIPE_IMAGE_PLACEHOLDER;
    el.classList.add("learnRecipeImgPlaceholder");
  }

  function handleRecipeKeyDown(e, recipe) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openRecipeWithBadge(recipe);
    }
  }

  function renderIngredients(recipe) {
    const raw = recipe?.ingredients;
    if (!raw) return "—";

    const parts = raw
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean);

    return parts.map((item, i) => {
      const parsed = parseIngredientLabel(item);
      const category = guessCategoryFromName(parsed.name);
      const isChecked = ingredientInList(parsed.name, category);

      return (
        <label key={i} className="learnIngredientRow">
          <input
            type="checkbox"
            className="learnIngredientCheckbox"
            checked={isChecked}
            onChange={() => handleIngredientToggle(item)}
          />
          <span className="learnIngredientLabel">{item}</span>
        </label>
      );
    });
  }

  function renderSteps(recipe) {
    const raw = recipe?.steps;
    if (!raw) return "—";

    const lines = raw.split(/\n+/).filter(Boolean);

    return lines.map((line, i) => (
      <div key={i} className="learnModalStep">
        <span className="learnModalStepNum">{i + 1}.</span> {line.trim()}
      </div>
    ));
  }

  function getYoutubeThumbUrl(video) {
    if (!video?.youtubeId) return null;
    return `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
  }

  function handleVideoKeyDown(e, video) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openVideoWithBadge(video);
    }
  }

  const availableCuisines = useMemo(() => {
    const byKey = new Map();
    for (const r of recipes) {
      for (const k of cuisineCanonicalKeysFromString(r?.cuisine || "")) {
        if (!byKey.has(k)) byKey.set(k, canonicalKeyToDisplay(k));
      }
    }
    return [...byKey.values()].sort((a, b) => a.localeCompare(b));
  }, [recipes]);

  const availableEquipment = useMemo(() => {
    const set = new Set();
    for (const r of recipes) {
      for (const tag of canonicalEquipmentTagsList(r?.equipment_tags)) {
        set.add(tag);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [recipes]);

  const visibleRecipes = useMemo(
    () =>
      recipes
        .filter((r) => recipeMatchesFilters(r, activeFilters))
        .filter((r) => recipeMatchesSearch(r, searchQuery.trim())),
    [recipes, activeFilters, searchQuery]
  );

  const visibleFavorites = useMemo(
    () =>
      favoritesList
        .filter((r) => recipeMatchesFilters(r, activeFilters))
        .filter((r) => recipeMatchesSearch(r, searchQuery.trim())),
    [favoritesList, activeFilters, searchQuery]
  );

  const groupedVideos = useMemo(
    () =>
      (videosData || [])
        .filter((v) => videoMatchesSearch(v, searchQuery.trim()))
        .reduce((map, v) => {
          const key = (v.category || "").trim() || "Other";
          if (!map[key]) map[key] = [];
          map[key].push(v);
          return map;
        }, {}),
    [searchQuery]
  );

  const sortedCategories = useMemo(
    () => Object.keys(groupedVideos).sort((a, b) => a.localeCompare(b)),
    [groupedVideos]
  );

  const showVideos = tab === "videos";
  const showRecipes = tab === "recipes";
  const showFavorites = tab === "favorites";

  const ingredientParts = selectedRecipe?.ingredients
    ? String(selectedRecipe.ingredients)
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean)
    : [];

  const selectedRecipeEquipmentTags = selectedRecipe
    ? canonicalEquipmentTagsList(selectedRecipe.equipment_tags)
    : [];

  const allIngredientsSelected =
    ingredientParts.length > 0 &&
    ingredientParts.every((label) => {
      const parsed = parseIngredientLabel(label);
      const category = guessCategoryFromName(parsed.name);
      return ingredientInList(parsed.name, category);
    });

  return (
    <div className="learnPage">
      <div className="learnHeader">
        <div className="learnTitle">Discover New Recipes</div>

        <div className="learnTabs">
          <button
            type="button"
            className={`learnTab ${showVideos ? "active" : ""}`}
            onClick={() => switchTab("videos")}
          >
            Videos
          </button>

          <button
            type="button"
            className={`learnTab ${showRecipes ? "active" : ""}`}
            onClick={() => switchTab("recipes")}
          >
            Recipes
          </button>

          <button
            type="button"
            className={`learnTab ${showFavorites ? "active" : ""}`}
            onClick={() => switchTab("favorites")}
          >
            Favorites
          </button>
        </div>

        <div className="learnSearchBar">
          <input
            type="search"
            className="learnSearchInput"
            placeholder={
              showRecipes
                ? "Search recipes…"
                : showFavorites
                ? "Search favorites…"
                : "Search videos…"
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {(showRecipes || showFavorites) && (
          <div className="learnFilterBar">
            {(() => {
              const excludedEquipment = activeFilters.filter((f) =>
                f.startsWith("e:")
              );
              const visibleFilterCount =
                activeFilters.length -
                excludedEquipment.length +
                (excludedEquipment.length > 0 ? 1 : 0);
              const visibleFilters = activeFilters.filter(
                (f) => !f.startsWith("e:")
              );

              function clearExcludedEquipment() {
                if (excludedEquipment.length === 0) return;
                setActiveFilters((prev) =>
                  prev.filter((f) => !f.startsWith("e:"))
                );
              }

              return (
                <>
                  <button
                    type="button"
                    className={`learnFilterToggle ${
                      showFilters ? "open" : ""
                    } ${activeFilters.length > 0 ? "hasFilters" : ""}`}
                    onClick={() => setShowFilters((prev) => !prev)}
                  >
                    Filter {visibleFilterCount > 0 ? `(${visibleFilterCount})` : ""}
                    <span className="learnFilterArrow">
                      {showFilters ? "▴" : "▾"}
                    </span>
                  </button>

                  {visibleFilters.map((f) => (
                    <span key={f} className="learnActiveChip">
                      {getFilterLabel(f)}
                      <button
                        type="button"
                        onClick={() => toggleFilter(f)}
                        aria-label={`Remove ${getFilterLabel(f)}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}

                  {excludedEquipment.length > 0 && (
                    <span key="excluded-equipment" className="learnActiveChip">
                      Excluding equipment
                      <button
                        type="button"
                        onClick={clearExcludedEquipment}
                        aria-label="Remove excluded equipment filters"
                      >
                        ×
                      </button>
                    </span>
                  )}

                  {activeFilters.length > 0 && (
                    <button
                      type="button"
                      className="learnClearFilters"
                      onClick={() => setActiveFilters([])}
                    >
                      Clear all
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {showFilters && (showRecipes || showFavorites) && (
        <div className="learnFilterPanel">
          <div className="learnFilterGroup">
            <div className="learnFilterGroupLabel">Meal Type</div>
            <div className="learnFilterOptions">
              {["Breakfast", "Lunch", "Dinner", "Dessert", "Snack", "Other"].map(
                (m) => (
                  <button
                    key={m}
                    type="button"
                    className={`learnFilterOption ${
                      activeFilters.includes(`m:${m}`) ? "active" : ""
                    }`}
                    onClick={() => toggleFilter(`m:${m}`)}
                  >
                    {m}
                  </button>
                )
              )}
              <button
                type="button"
                className={`learnFilterOption ${
                  activeFilters.includes("rec:recommended") ? "active" : ""
                }`}
                onClick={() => toggleFilter("rec:recommended")}
              >
                ★ Recommended
              </button>
            </div>
          </div>

          {availableCuisines.length > 0 && (
            <div className="learnFilterGroup">
              <div className="learnFilterGroupLabel">Cuisine</div>
              <div className="learnFilterOptions">
                {availableCuisines.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`learnFilterOption ${
                      activeFilters.includes(`c:${c}`) ? "active" : ""
                    }`}
                    onClick={() => toggleFilter(`c:${c}`)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="learnFilterGroup">
            <div className="learnFilterGroupLabel">Prep Time</div>
            <div className="learnFilterOptions">
              {TIME_FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`learnFilterOption ${
                    activeFilters.includes(id) ? "active" : ""
                  }`}
                  onClick={() => toggleFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="learnFilterGroup">
            <div className="learnFilterGroupLabel">Dietary</div>
            <div className="learnFilterOptions">
              {DIETARY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`learnFilterOption ${
                    activeFilters.includes(`d:${d}`) ? "active" : ""
                  }`}
                  onClick={() => toggleFilter(`d:${d}`)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {availableEquipment.length > 0 && (
            <div className="learnFilterGroup">
              <div className="learnFilterGroupLabel">Exclude Equipment</div>
              <div className="learnFilterOptions">
                {availableEquipment.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`learnFilterOption learnExcludeOption ${
                      activeFilters.includes(`e:${e}`) ? "active" : ""
                    }`}
                    onClick={() => toggleFilter(`e:${e}`)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="learnBody">
        {showVideos && (
          <div className="learnVideoList">
            {sortedCategories.length === 0 && (
              <div className="learnRecipesEmpty">
                No videos match &ldquo;{searchQuery}&rdquo;.
              </div>
            )}

            {sortedCategories.map((cat) => (
              <div key={cat} className="learnVideoCategorySection">
                <div className="learnVideoCategoryTitle">{cat}</div>

                <div className="learnVideoGrid">
                  {groupedVideos[cat].map((v) => {
                    const thumb = getYoutubeThumbUrl(v);

                    return (
                      <div key={v.id} className="learnVideoCard">
                        <div
                          className="learnVideoThumb"
                          role="button"
                          tabIndex={0}
                          aria-label={`Play video: ${v.title}`}
                          onClick={() => openVideoWithBadge(v)}
                          onKeyDown={(e) => handleVideoKeyDown(e, v)}
                          style={
                            thumb
                              ? {
                                  backgroundImage: `url(${thumb})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }
                              : undefined
                          }
                        >
                          <div className="learnPlayCircle">▶</div>
                        </div>

                        <div className="learnVideoText">
                          <div className="learnVideoTitle">{v.title}</div>
                          <div className="learnVideoAuthor">
                            {v.source}
                            {v.category ? ` • ${v.category}` : ""}
                            {v.program ? ` • ${v.program}` : ""}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {showRecipes && (
          <div className="learnRecipeList">
            {recipesLoading && (
              <div className="learnRecipesLoading">Loading recipes…</div>
            )}

            {recipesError && (
              <div className="learnRecipesError">{recipesError}</div>
            )}

            {!recipesLoading && !recipesError && recipes.length === 0 && (
              <div className="learnRecipesEmpty">
                No recipes to show. Add dietary preferences in your Account to
                see filtered recipes, or we'll show all when available.
              </div>
            )}

            {!recipesLoading &&
              recipes.length > 0 &&
              visibleRecipes.length === 0 && (
                <div className="learnRecipesEmpty">
                  No recipes match &ldquo;{searchQuery}&rdquo;.
                </div>
              )}

            {!recipesLoading &&
              visibleRecipes.map((r) => {
                const equipmentTags = canonicalEquipmentTagsList(
                  r.equipment_tags
                );

                return (
                  <div
                    key={`${r.category}-${r.title}`}
                    className="learnRecipeRow"
                    role="button"
                    tabIndex={0}
                    onClick={() => openRecipeWithBadge(r)}
                    onKeyDown={(e) => handleRecipeKeyDown(e, r)}
                  >
                    <div className="learnRecipeThumbCol">
                      <div className="learnRecipeImgWrap">
                        <img
                          className={`learnRecipeImg ${
                            !recipeHasRenderableImage(r)
                              ? "learnRecipeImgPlaceholder"
                              : ""
                          }`}
                          src={getRecipeImageUrl(r)}
                          alt={r.title}
                          referrerPolicy="no-referrer"
                          onError={handleRecipeImageError}
                        />
                      </div>
                      {r.recommended && (
                        <div className="learnRecipeRecommendedBadge">
                          ★ Recommended
                        </div>
                      )}
                    </div>

                    <div className="learnRecipeMid">
                      <div className="learnRecipeCategory">{r.category}</div>

                      {r.source_url && (
                        <div className="learnRecipeSourceRow">
                          <a
                            className="learnRecipeSourceLink"
                            href={recipeSourceHref(r.source_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Source
                          </a>
                        </div>
                      )}

                      <div className="learnRecipeTitle">{r.title}</div>
                      <div className="learnRecipeCTA">Click for full recipe</div>

                      {r.cuisine && (
                        <div className="learnRecipeTags">
                          <span className="learnRecipeTag learnCuisineTag">
                            {r.cuisine}
                          </span>
                          {r.cuisine_also_tagged && (
                            <span className="learnRecipeTag learnCuisineTag">
                              {r.cuisine_also_tagged}
                            </span>
                          )}
                        </div>
                      )}

                      {r.dietary_tags && r.dietary_tags.length > 0 && (
                        <div className="learnRecipeTags">
                          {r.dietary_tags.map((tag) => (
                            <span key={tag} className="learnRecipeTag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {equipmentTags.length > 0 && (
                        <div className="learnRecipeTags">
                          {equipmentTags.map((tag) => (
                            <span
                              key={tag}
                              className="learnRecipeTag learnEquipmentTag"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="learnRecipeMeta">
                      <button
                        type="button"
                        className={`favBtn ${isFavorite(r) ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(r);
                        }}
                        aria-label={
                          isFavorite(r)
                            ? "Remove from favorites"
                            : "Save to favorites"
                        }
                        title={isFavorite(r) ? "Saved" : "Save"}
                      >
                        {isFavorite(r) ? "★ Saved" : "☆ Save"}
                      </button>

                      <div className="learnMetaRow">
                        <span className="learnMetaIcon">⏱</span>
                        <span>{r.minutes || "—"} mins</span>
                      </div>

                      <div className="learnMetaRow">
                        <span className="learnMetaIcon">🍽</span>
                        <span>{r.serving_size || "—"} servings</span>
                      </div>

                      <div className="learnMetaRow">
                        <span className="learnMetaIcon">🔥</span>
                        <span>{r.calories != null ? r.calories : "—"} cal</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {showFavorites && (
          <div className="learnRecipeList">
            {favoritesList.length === 0 ? (
              <div className="learnRecipesEmpty">
                No favorites yet. Tap ☆ Save on a recipe to add it here.
              </div>
            ) : visibleFavorites.length === 0 ? (
              <div className="learnRecipesEmpty">
                No favorites match &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              visibleFavorites.map((r) => {
                const equipmentTags = canonicalEquipmentTagsList(
                  r.equipment_tags
                );

                return (
                  <div
                    key={`fav-${r.id ?? `${r.category}-${r.title}`}`}
                    className="learnRecipeRow"
                    role="button"
                    tabIndex={0}
                    onClick={() => openRecipeWithBadge(r)}
                    onKeyDown={(e) => handleRecipeKeyDown(e, r)}
                  >
                    <div className="learnRecipeThumbCol">
                      <div className="learnRecipeImgWrap">
                        <img
                          className={`learnRecipeImg ${
                            !recipeHasRenderableImage(r)
                              ? "learnRecipeImgPlaceholder"
                              : ""
                          }`}
                          src={getRecipeImageUrl(r)}
                          alt={r.title}
                          referrerPolicy="no-referrer"
                          onError={handleRecipeImageError}
                        />
                      </div>
                      {r.recommended && (
                        <div className="learnRecipeRecommendedBadge">
                          ★ Recommended
                        </div>
                      )}
                    </div>

                    <div className="learnRecipeMid">
                      <div className="learnRecipeCategory">{r.category}</div>

                      {r.source_url && (
                        <div className="learnRecipeSourceRow">
                          <a
                            className="learnRecipeSourceLink"
                            href={recipeSourceHref(r.source_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Source
                          </a>
                        </div>
                      )}

                      <div className="learnRecipeTitle">{r.title}</div>
                      <div className="learnRecipeCTA">Click for full recipe</div>

                      {r.cuisine && (
                        <div className="learnRecipeTags">
                          <span className="learnRecipeTag learnCuisineTag">
                            {r.cuisine}
                          </span>
                          {r.cuisine_also_tagged && (
                            <span className="learnRecipeTag learnCuisineTag">
                              {r.cuisine_also_tagged}
                            </span>
                          )}
                        </div>
                      )}

                      {r.dietary_tags && r.dietary_tags.length > 0 && (
                        <div className="learnRecipeTags">
                          {r.dietary_tags.map((tag) => (
                            <span key={tag} className="learnRecipeTag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {equipmentTags.length > 0 && (
                        <div className="learnRecipeTags">
                          {equipmentTags.map((tag) => (
                            <span
                              key={tag}
                              className="learnRecipeTag learnEquipmentTag"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="learnRecipeMeta">
                      <button
                        type="button"
                        className={`favBtn ${isFavorite(r) ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(r);
                        }}
                        aria-label="Remove from favorites"
                        title="Remove"
                      >
                        ★ Saved
                      </button>

                      <div className="learnMetaRow">
                        <span className="learnMetaIcon">⏱</span>
                        <span>{r.minutes || "—"} mins</span>
                      </div>

                      <div className="learnMetaRow">
                        <span className="learnMetaIcon">🍽</span>
                        <span>{r.serving_size || "—"} servings</span>
                      </div>

                      <div className="learnMetaRow">
                        <span className="learnMetaIcon">🔥</span>
                        <span>{r.calories != null ? r.calories : "—"} cal</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {selectedRecipe && (
        <div
          className="learnModalOverlay"
          onClick={() => {
            setSelectedRecipe(null);
            setChompyResponse(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="learnModalTitle"
        >
          <div className="learnModal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="learnModalClose"
              onClick={() => {
                setSelectedRecipe(null);
                setChompyResponse(null);
              }}
              aria-label="Close"
            >
              ×
            </button>

            <div className="learnModalContent">
              <h2 id="learnModalTitle" className="learnModalTitle">
                {selectedRecipe.title}
              </h2>

              <div className="learnModalCategory">{selectedRecipe.category}</div>

              {selectedRecipe.source_url && (
                <div className="learnModalSource">
                  <a
                    href={recipeSourceHref(selectedRecipe.source_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View original recipe
                  </a>
                </div>
              )}

              {selectedRecipe.cuisine && (
                <div className="learnModalTags" style={{ marginBottom: "4px" }}>
                  <span className="learnModalTag learnCuisineTag">
                    {selectedRecipe.cuisine}
                  </span>
                  {selectedRecipe.cuisine_also_tagged && (
                    <span className="learnModalTag learnCuisineTag">
                      {selectedRecipe.cuisine_also_tagged}
                    </span>
                  )}
                </div>
              )}

              <div className="learnModalTopActions">
                <button
                  type="button"
                  className={`favBtn ${isFavorite(selectedRecipe) ? "active" : ""}`}
                  onClick={() => toggleFavorite(selectedRecipe)}
                >
                  {isFavorite(selectedRecipe) ? "★ Saved" : "☆ Save"}
                </button>

                <button
                  type="button"
                  className="chompyBtn"
                  onClick={() => handleAskChompy(selectedRecipe)}
                  disabled={chompyLoading}
                >
                  {chompyLoading ? "🤖 Thinking..." : "🤖 Ask Chompy"}
                </button>
              </div>

              {chompyLoading && (
                <div className="learnChompyResponse">Chompy is thinking...</div>
              )}

              {chompyResponse && (
                <div className="learnChompyResponse">
                  <ReactMarkdown>{chompyResponse}</ReactMarkdown>
                </div>
              )}

              {selectedRecipe.dietary_tags &&
                selectedRecipe.dietary_tags.length > 0 && (
                  <div className="learnModalTags">
                    {selectedRecipe.dietary_tags.map((tag) => (
                      <span key={tag} className="learnModalTag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

              {selectedRecipeEquipmentTags.length > 0 && (
                <div className="learnModalTags">
                  {selectedRecipeEquipmentTags.map((tag) => (
                    <span
                      key={tag}
                      className="learnModalTag learnEquipmentTag"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="learnModalMeta">
                <span>⏱ {selectedRecipe.minutes || "—"} mins</span>
                <span>🍽 {selectedRecipe.serving_size || "—"} servings</span>
                <span>
                  🔥 {selectedRecipe.calories != null ? selectedRecipe.calories : "—"} cal/serving
                </span>
              </div>

              <div className="learnModalImgWrap">
                <img
                  src={getRecipeImageUrl(selectedRecipe)}
                  alt={selectedRecipe.title}
                  className={`learnModalImg ${
                    !recipeHasRenderableImage(selectedRecipe)
                      ? "learnRecipeImgPlaceholder"
                      : ""
                  }`}
                  referrerPolicy="no-referrer"
                  onError={handleRecipeImageError}
                />
              </div>

              {selectedRecipe.recommended && (
                <div className="learnModalRecommendedBadge">★ Recommended</div>
              )}

              <section className="learnModalSection">
                <div className="learnIngredientsHeader">
                  <h3>Ingredients</h3>
                  {ingredientParts.length > 0 && (
                    <button
                      type="button"
                      className="learnAddAllBtn"
                      onClick={() => handleToggleAllIngredients(ingredientParts)}
                    >
                      {allIngredientsSelected ? "Deselect all" : "Add all to list"}
                    </button>
                  )}
                </div>
                <div className="learnModalText learnModalIngredients">
                  {renderIngredients(selectedRecipe)}
                </div>
              </section>

              <section className="learnModalSection">
                <h3>Steps</h3>
                <div className="learnModalText learnModalSteps">
                  {renderSteps(selectedRecipe)}
                </div>
              </section>

              {selectedRecipe.healthier_changes && (
                <section className="learnModalSection">
                  <h3>Healthier changes</h3>
                  <div className="learnModalText learnHealthierChanges">
                    {selectedRecipe.healthier_changes}
                  </div>
                </section>
              )}

              <section className="learnModalSection">
                <h3>Nutrition per serving</h3>
                <div className="learnModalNutrition">
                  <div>
                    Calories:{" "}
                    {selectedRecipe.calories != null
                      ? selectedRecipe.calories
                      : "—"}
                  </div>
                  <div>
                    Protein:{" "}
                    {selectedRecipe.protein_g != null
                      ? `${selectedRecipe.protein_g} g`
                      : "—"}
                  </div>
                  <div>
                    Carbs:{" "}
                    {selectedRecipe.carbs_g != null
                      ? `${selectedRecipe.carbs_g} g`
                      : "—"}
                  </div>
                  <div>
                    Fat:{" "}
                    {selectedRecipe.fat_g != null
                      ? `${selectedRecipe.fat_g} g`
                      : "—"}
                  </div>
                  <div>
                    Fiber:{" "}
                    {selectedRecipe.fiber_g != null
                      ? `${selectedRecipe.fiber_g} g`
                      : "—"}
                  </div>
                  <div>
                    Sodium:{" "}
                    {selectedRecipe.sodium_mg != null
                      ? `${selectedRecipe.sodium_mg} mg`
                      : "—"}
                  </div>
                  <div>
                    Sugar:{" "}
                    {selectedRecipe.sugar_g != null
                      ? `${selectedRecipe.sugar_g} g`
                      : "—"}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {selectedVideo && (
        <div
          className="learnModalOverlay"
          onClick={() => setSelectedVideo(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="learnVideoModalTitle"
        >
          <div className="learnModal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="learnModalClose"
              onClick={() => setSelectedVideo(null)}
              aria-label="Close"
            >
              ×
            </button>

            <div className="learnModalContent">
              <h2 id="learnVideoModalTitle" className="learnModalTitle">
                {selectedVideo.title}
              </h2>

              <div className="learnModalCategory">
                {selectedVideo.source}
                {selectedVideo.category ? ` • ${selectedVideo.category}` : ""}
                {selectedVideo.program ? ` • ${selectedVideo.program}` : ""}
              </div>

              <div style={{ marginTop: 12 }}>
                <iframe
                  width="100%"
                  height="315"
                  src={selectedVideo.youtubeEmbedUrl}
                  title={selectedVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{ borderRadius: 10 }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}