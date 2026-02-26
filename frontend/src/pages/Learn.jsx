import React, { useState, useEffect } from "react";
import "./Learn.css";

import videosData from "../data/videos.json";
import { useFavorites } from "../context/FavoritesContext";

const API_BASE = "http://localhost:8000";

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
    const parts = raw.split(";");
    return parts.map((item, i) => <div key={i}>{item.trim()}</div>);
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

  const showVideos = tab === "videos";
  const showRecipes = tab === "recipes";
  const showFavorites = tab === "favorites";

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
            {(videosData || []).map((v) => {
              const thumb = getYoutubeThumbUrl(v);
              return (
                <div key={v.id} className="learnVideoRow">
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
                see filtered recipes, or we’ll show all when available.
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
                    {/* Favorites button */}
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
                        toggleFavorite(r); // removes
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

              {/* Favorites in modal */}
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
                <h3>Ingredients</h3>
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
                    {selectedRecipe.fat_g != null ? `${selectedRecipe.fat_g} g` : "—"}
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