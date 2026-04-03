// Learn.jsx
import React, { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import "./Learn.css";

import videosData from "../data/videos.json";
import { useFavorites } from "../context/FavoritesContext";
import { useGrocery } from "../grocery/GroceryContext";
import { guessCategoryFromName, INGREDIENT_UNITS } from "../grocery/categories";

const API_BASE = "http://localhost:8000";
const RECIPE_IMAGE_PLACEHOLDER = `${import.meta.env.BASE_URL}recipe-bowl-placeholder.svg`;

function recipeMatchesSearch(r, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    r.title.toLowerCase().includes(q) ||
    r.category.toLowerCase().includes(q) ||
    (r.cuisine || "").toLowerCase().includes(q) ||
    (r.dietary_tags || []).some((t) => t.toLowerCase().includes(q)) ||
    (r.equipment_tags || []).some((t) => t.toLowerCase().includes(q)) ||
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
      const tags = (r.equipment_tags || []).map((t) => t.toLowerCase());
      if (tags.includes(value.toLowerCase())) return false;
    } else if (type === "m") {
      if (r.category !== value) return false;
    } else if (type === "c") {
      if ((r.cuisine || "") !== value) return false;
    } else if (type === "t") {
      const mins = parseFloat(r.minutes);
      if (isNaN(mins) || mins > parseFloat(value)) return false;
    }
  }
  return true;
}

const DIETARY_OPTIONS = [
  "Dairy-free", "Egg-free", "Gluten-free", "Keto", "Low-carb",
  "Low-fat", "Low-salt", "Low-sugar", "No seafood", "Nut-free",
  "Paleo", "Soy-free", "Vegan", "Vegetarian",
];

const TIME_FILTERS = [
  { id: "t:20", label: "Under 20 min" },
  { id: "t:30", label: "Under 30 min" },
  { id: "t:45", label: "Under 45 min" },
];

function shortCuisineLabel(cuisine) {
  return cuisine.replace(/ \(.*\)$/, "").replace(" & barbecue", "").trim();
}

function getFilterLabel(id) {
  const colon = id.indexOf(":");
  const type = id.slice(0, colon);
  const value = id.slice(colon + 1);
  if (type === "t") return `Under ${value} min`;
  if (type === "e") return `No ${value}`;
  return value;
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
  "Oven (conventional)",
  "Pots & Pans",
  "Microwave",
  "Refrigerator / Fridge",
  "Stove / Range / Stovetop",
];

function equipmentTagsFromProfileKitchenEquipment(kitchenEquipment) {
  const list = Array.isArray(kitchenEquipment) ? kitchenEquipment : [];
  const map = {
    "Air-fryer": "Air Fryer",
    Blender: "Blender",
    "Cutting board": "Cutting Board",
    "Food processor": "Food Processor",
    "Good set of knives": "Knives (explicit mention)",
    Oven: "Oven (conventional)",
    "Pots and pans": "Pots & Pans",
    "Pressure cooker or Instapot": "Pressure Cooker / Instant Pot",
    Microwave: "Microwave",
    "Toaster oven": "Toaster Oven",
    Refrigerator: "Refrigerator / Fridge",
    "Rice cooker": "Rice Cooker",
    "Slow cooker (crock-pot)": "Slow Cooker",
    "Stand mixer": "Stand Mixer",
    "Stove or range": "Stove / Range / Stovetop",
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
      if (Number.isFinite(value)) {
        total += value;
      }
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

  function switchTab(newTab) {
    setTab(newTab);
    setSearchQuery("");
    setShowFilters(false);
  }

  function toggleFilter(id) {
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }

  // Favorites
  const { isFavorite, toggleFavorite, favoritesList } = useFavorites();

  // Recipes state
  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipesError, setRecipesError] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [chompyLoading, setChompyLoading] = useState(false);
  const [chompyResponse, setChompyResponse] = useState(null);

  // Video modal state
  const [selectedVideo, setSelectedVideo] = useState(null);

  const { items, addItem, removeItem } = useGrocery();

  let userEmail = null;
  try {
    userEmail = localStorage.getItem("currentUserEmail");
  } catch (_) {}

  // Set default filters from user's dietary profile on load
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

        const available = equipmentTagsFromProfileKitchenEquipment(data?.kitchen_equipment);
        for (const tag of EQUIPMENT_TAGS) {
          if (!available.has(tag)) next.push(`e:${tag}`);
        }

        if (next.length > 0) setActiveFilters(next);
      })
      .catch(() => {});
  }, [userEmail]);

  // Fetch recipes when Recipes tab is active
  useEffect(() => {
    if (tab !== "recipes") return;

    setRecipesLoading(true);
    setRecipesError(null);

    const url = `${API_BASE}/recipes`;

    fetch(url)
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

  // ---------- Helpers (Recipes) ----------

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
        String(x.name || "").trim().toLowerCase() === parsed.name.toLowerCase() &&
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

  // TODO: Chompy actions (make healthier, log meal, substitutions etc)
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
          original_recipe_text: `Title: ${recipe.title}\nIngredients: ${recipe.ingredients}\nSteps: ${recipe.steps}`
        })
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
    if (!recipe || !recipe.image_filename) return RECIPE_IMAGE_PLACEHOLDER;
    const encoded = encodeURIComponent(recipe.image_filename);
    return `${API_BASE}/recipes/images/${encoded}`;
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
      setSelectedRecipe(recipe);
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

  // ---------- Helpers (Videos) ----------
  function getYoutubeThumbUrl(video) {
    if (!video?.youtubeId) return null;
    return `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
  }

  function handleVideoKeyDown(e, video) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedVideo(video);
    }
  }

  // ---------- Filter + Search ----------

  const availableCuisines = useMemo(() => {
    const set = new Set();
    for (const r of recipes) {
      if (r?.cuisine) set.add(r.cuisine);
    }
    return [...set].sort();
  }, [recipes]);

  const availableEquipment = useMemo(() => {
    const set = new Set();
    for (const r of recipes) {
      const tags = Array.isArray(r?.equipment_tags) ? r.equipment_tags : [];
      for (const tag of tags) {
        if (tag) set.add(tag);
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

  // ---------- Group Videos by Category ----------
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
              const excludedEquipment = activeFilters.filter((f) => f.startsWith("e:"));
              const visibleFilterCount = activeFilters.length - excludedEquipment.length + (excludedEquipment.length > 0 ? 1 : 0);
              const visibleFilters = activeFilters.filter((f) => !f.startsWith("e:"));

              function clearExcludedEquipment() {
                if (excludedEquipment.length === 0) return;
                setActiveFilters((prev) => prev.filter((f) => !f.startsWith("e:")));
              }

              return (
                <>
                  <button
                    type="button"
                    className={`learnFilterToggle ${showFilters ? "open" : ""} ${activeFilters.length > 0 ? "hasFilters" : ""}`}
                    onClick={() => setShowFilters((prev) => !prev)}
                  >
                    Filter {visibleFilterCount > 0 ? `(${visibleFilterCount})` : ""}
                    <span className="learnFilterArrow">{showFilters ? "▴" : "▾"}</span>
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
              {["Breakfast", "Lunch", "Dinner", "Dessert"].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`learnFilterOption ${activeFilters.includes(`m:${m}`) ? "active" : ""}`}
                  onClick={() => toggleFilter(`m:${m}`)}
                >
                  {m}
                </button>
              ))}
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
                    className={`learnFilterOption ${activeFilters.includes(`c:${c}`) ? "active" : ""}`}
                    onClick={() => toggleFilter(`c:${c}`)}
                  >
                    {shortCuisineLabel(c)}
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
                  className={`learnFilterOption ${activeFilters.includes(id) ? "active" : ""}`}
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
                  className={`learnFilterOption ${activeFilters.includes(`d:${d}`) ? "active" : ""}`}
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
                    className={`learnFilterOption learnExcludeOption ${activeFilters.includes(`e:${e}`) ? "active" : ""}`}
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
        {/* ===================== VIDEOS TAB ===================== */}
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

                {/* GRID WRAPPER */}
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
                          onClick={() => setSelectedVideo(v)}
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

        {/* ===================== RECIPES TAB ===================== */}
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

            {!recipesLoading && recipes.length > 0 && visibleRecipes.length === 0 && (
              <div className="learnRecipesEmpty">
                No recipes match &ldquo;{searchQuery}&rdquo;.
              </div>
            )}

            {!recipesLoading &&
              visibleRecipes.map((r) => (
                <div
                  key={`${r.category}-${r.title}`}
                  className="learnRecipeRow"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedRecipe(r)}
                  onKeyDown={(e) => handleRecipeKeyDown(e, r)}
                >
                  <div className="learnRecipeImgWrap">
                    <img
                      className={`learnRecipeImg ${!r.image_filename ? "learnRecipeImgPlaceholder" : ""}`}
                      src={getRecipeImageUrl(r)}
                      alt={r.title}
                      onError={handleRecipeImageError}
                    />
                  </div>

                  <div className="learnRecipeMid">
                    <div className="learnRecipeCategory">{r.category}</div>
                    <div className="learnRecipeTitle">{r.title}</div>
                    <div className="learnRecipeCTA">Click for full recipe</div>

                    {r.cuisine && (
                      <div className="learnRecipeTags">
                        <span className="learnRecipeTag learnCuisineTag">{r.cuisine}</span>
                        {r.cuisine_also_tagged && (
                          <span className="learnRecipeTag learnCuisineTag">{r.cuisine_also_tagged}</span>
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

                    {r.equipment_tags && r.equipment_tags.length > 0 && (
                      <div className="learnRecipeTags">
                        {r.equipment_tags.map((tag) => (
                          <span key={tag} className="learnRecipeTag learnEquipmentTag">
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
              ))}
          </div>
        )}

        {/* ===================== FAVORITES TAB ===================== */}
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
              visibleFavorites.map((r) => (
                <div
                  key={`fav-${r.id ?? `${r.category}-${r.title}`}`}
                  className="learnRecipeRow"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedRecipe(r)}
                  onKeyDown={(e) => handleRecipeKeyDown(e, r)}
                >
                  <div className="learnRecipeImgWrap">
                    <img
                      className={`learnRecipeImg ${!r.image_filename ? "learnRecipeImgPlaceholder" : ""}`}
                      src={getRecipeImageUrl(r)}
                      alt={r.title}
                      onError={handleRecipeImageError}
                    />
                  </div>

                  <div className="learnRecipeMid">
                    <div className="learnRecipeCategory">{r.category}</div>
                    <div className="learnRecipeTitle">{r.title}</div>
                    <div className="learnRecipeCTA">Click for full recipe</div>

                    {r.cuisine && (
                      <div className="learnRecipeTags">
                        <span className="learnRecipeTag learnCuisineTag">{r.cuisine}</span>
                        {r.cuisine_also_tagged && (
                          <span className="learnRecipeTag learnCuisineTag">{r.cuisine_also_tagged}</span>
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
              ))
            )}
          </div>
        )}
      </div>

      {/* ===================== RECIPE MODAL ===================== */}
      {selectedRecipe && (
        <div
          className="learnModalOverlay"
          onClick={() => { setSelectedRecipe(null); setChompyResponse(null); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="learnModalTitle"
        >
          <div className="learnModal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="learnModalClose"
              onClick={() => { setSelectedRecipe(null); setChompyResponse(null); }}
              aria-label="Close"
            >
              ×
            </button>

            <div className="learnModalContent">
              <h2 id="learnModalTitle" className="learnModalTitle">
                {selectedRecipe.title}
              </h2>

              <div className="learnModalCategory">{selectedRecipe.category}</div>

              {selectedRecipe.cuisine && (
                <div className="learnModalTags" style={{ marginBottom: "4px" }}>
                  <span className="learnModalTag learnCuisineTag">{selectedRecipe.cuisine}</span>
                  {selectedRecipe.cuisine_also_tagged && (
                    <span className="learnModalTag learnCuisineTag">{selectedRecipe.cuisine_also_tagged}</span>
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

              {chompyLoading && <div className="learnChompyResponse">Chompy is thinking...</div>}
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

              {selectedRecipe.equipment_tags &&
                selectedRecipe.equipment_tags.length > 0 && (
                  <div className="learnModalTags">
                    {selectedRecipe.equipment_tags.map((tag) => (
                      <span key={tag} className="learnModalTag learnEquipmentTag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

              <div className="learnModalMeta">
                <span>⏱ {selectedRecipe.minutes || "—"} mins</span>
                <span>🍽 {selectedRecipe.serving_size || "—"} servings</span>
                <span>
                  🔥{" "}
                  {selectedRecipe.calories != null
                    ? selectedRecipe.calories
                    : "—"}{" "}
                  cal/serving
                </span>
              </div>

              <div className="learnModalImgWrap">
                <img
                  src={getRecipeImageUrl(selectedRecipe)}
                  alt={selectedRecipe.title}
                  className={`learnModalImg ${!selectedRecipe.image_filename ? "learnRecipeImgPlaceholder" : ""}`}
                  onError={handleRecipeImageError}
                />
              </div>

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

      {/* ===================== VIDEO MODAL ===================== */}
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