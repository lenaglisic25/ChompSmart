// Learn.jsx
import React, { useState, useEffect, useMemo } from "react";
import "./Learn.css";

import videosData from "../data/videos.json";
import { useFavorites } from "../context/FavoritesContext";
import { useGrocery } from "../Grocery/GroceryContext";
import { guessCategoryFromName, INGREDIENT_UNITS } from "../Grocery/categories";

const API_BASE = "http://localhost:8000";

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

  // Favorites
  const { isFavorite, toggleFavorite, favoritesList } = useFavorites();

  // Recipes state
  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipesError, setRecipesError] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // Video modal state
  const [selectedVideo, setSelectedVideo] = useState(null);

  const { items, addItem, removeItem } = useGrocery();

  let userEmail = null;
  try {
    userEmail = localStorage.getItem("currentUserEmail");
  } catch (_) {}

  // Fetch recipes when Recipes tab is active
  useEffect(() => {
    if (tab !== "recipes") return;

    setRecipesLoading(true);
    setRecipesError(null);

    let url = `${API_BASE}/recipes`;
    if (userEmail) {
      url = `${API_BASE}/recipes?user_email=${encodeURIComponent(userEmail)}`;
    }

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
  }, [tab, userEmail]);

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

  function getRecipeImageUrl(recipe) {
    if (!recipe || !recipe.image_filename) return null;
    const encoded = encodeURIComponent(recipe.image_filename);
    return `${API_BASE}/recipes/images/${encoded}`;
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

  // ---------- Group Videos by Category ----------
  const groupedVideos = useMemo(() => {
    return (videosData || []).reduce((map, v) => {
      const key =
        v.category && String(v.category).trim()
          ? String(v.category).trim()
          : "Other";
      if (!map[key]) map[key] = [];
      map[key].push(v);
      return map;
    }, {});
  }, []);

  const sortedCategories = useMemo(() => {
    return Object.keys(groupedVideos).sort((a, b) => a.localeCompare(b));
  }, [groupedVideos]);

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
            onClick={() => setTab("videos")}
          >
            Videos
          </button>

          <button
            type="button"
            className={`learnTab ${showRecipes ? "active" : ""}`}
            onClick={() => setTab("recipes")}
          >
            Recipes
          </button>

          <button
            type="button"
            className={`learnTab ${showFavorites ? "active" : ""}`}
            onClick={() => setTab("favorites")}
          >
            Favorites
          </button>
        </div>
      </div>

      <div className="learnBody">
        {/* ===================== VIDEOS TAB ===================== */}
        {showVideos && (
          <div className="learnVideoList">
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

            {!recipesLoading &&
              recipes.map((r) => (
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
                      className="learnRecipeImg"
                      src={getRecipeImageUrl(r) || ""}
                      alt={r.title}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const parent = e.currentTarget.parentElement;
                        if (parent) parent.classList.add("fallback");
                      }}
                    />
                  </div>

                  <div className="learnRecipeMid">
                    <div className="learnRecipeCategory">{r.category}</div>
                    <div className="learnRecipeTitle">{r.title}</div>
                    <div className="learnRecipeCTA">Click for full recipe</div>

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
            ) : (
              favoritesList.map((r) => (
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
                      className="learnRecipeImg"
                      src={getRecipeImageUrl(r) || ""}
                      alt={r.title}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const parent = e.currentTarget.parentElement;
                        if (parent) parent.classList.add("fallback");
                      }}
                    />
                  </div>

                  <div className="learnRecipeMid">
                    <div className="learnRecipeCategory">{r.category}</div>
                    <div className="learnRecipeTitle">{r.title}</div>
                    <div className="learnRecipeCTA">Click for full recipe</div>

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
          onClick={() => setSelectedRecipe(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="learnModalTitle"
        >
          <div className="learnModal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="learnModalClose"
              onClick={() => setSelectedRecipe(null)}
              aria-label="Close"
            >
              ×
            </button>

            <div className="learnModalContent">
              <h2 id="learnModalTitle" className="learnModalTitle">
                {selectedRecipe.title}
              </h2>

              <div className="learnModalCategory">{selectedRecipe.category}</div>

              <button
                type="button"
                className={`favBtn ${isFavorite(selectedRecipe) ? "active" : ""}`}
                onClick={() => toggleFavorite(selectedRecipe)}
                style={{ marginTop: 10 }}
              >
                {isFavorite(selectedRecipe) ? "★ Saved" : "☆ Save"}
              </button>

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

              {selectedRecipe.image_filename && (
                <div className="learnModalImgWrap">
                  <img
                    src={getRecipeImageUrl(selectedRecipe)}
                    alt={selectedRecipe.title}
                    className="learnModalImg"
                  />
                </div>
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
