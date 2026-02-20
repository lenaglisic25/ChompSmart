import React, { useMemo, useState, useEffect } from "react";
import "./Learn.css";

const API_BASE = "http://localhost:8000";

const VIDEO_LIST = [
  { id: 1, title: "10 Low-Calorie Foods You Can Eat Every Day Without Gaining Weight", author: "John Doe Loves Cooking" },
  { id: 2, title: "High-Protein, Low-Calorie Meals for Busy Days", author: "John Doe Loves Cooking" },
  { id: 3, title: "These Low-Calorie Foods Feel Illegal", author: "John Doe Loves Cooking" },
  { id: 4, title: "This High-Protein Meal Takes Only 10 Minutes to Make", author: "John Doe Loves Cooking" },
  { id: 5, title: "5 Snacks I Would Stay Away From, and 5 Snacks I Eat Every Day", author: "John Doe Loves Cooking" },
];

export default function Learn() {
  const [tab, setTab] = useState("recipes");
  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipesError, setRecipesError] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  let userEmail = null;
  try {
    userEmail = localStorage.getItem("currentUserEmail");
  } catch (_) {}

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
        if (!res.ok) {
          throw new Error("Failed to load recipes");
        }
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

  function getRecipeImageUrl(recipe) {
    if (!recipe || !recipe.image_filename) {
      return null;
    }
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

  const showVideos = tab === "videos";
  const showRecipes = tab === "recipes";

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
        </div>
      </div>

      <div className="learnBody">
        {showVideos && (
          <div className="learnVideoList">
            {VIDEO_LIST.map((v) => (
              <div key={v.id} className="learnVideoRow">
                <div className="learnVideoThumb" role="button" tabIndex={0}>
                  <div className="learnPlayCircle">▶</div>
                </div>
                <div className="learnVideoText">
                  <div className="learnVideoTitle">{v.title}</div>
                  <div className="learnVideoAuthor">By {v.author}</div>
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
                No recipes to show. Add dietary preferences in your Account to see filtered recipes, or we’ll show all when available.
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
      </div>

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
              {selectedRecipe.dietary_tags && selectedRecipe.dietary_tags.length > 0 && (
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
                <span>🔥 {selectedRecipe.calories != null ? selectedRecipe.calories : "—"} cal/serving</span>
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
                  <div>Calories: {selectedRecipe.calories != null ? selectedRecipe.calories : "—"}</div>
                  <div>Protein: {selectedRecipe.protein_g != null ? `${selectedRecipe.protein_g} g` : "—"}</div>
                  <div>Carbs: {selectedRecipe.carbs_g != null ? `${selectedRecipe.carbs_g} g` : "—"}</div>
                  <div>Fat: {selectedRecipe.fat_g != null ? `${selectedRecipe.fat_g} g` : "—"}</div>
                  <div>Fiber: {selectedRecipe.fiber_g != null ? `${selectedRecipe.fiber_g} g` : "—"}</div>
                  <div>Sodium: {selectedRecipe.sodium_mg != null ? `${selectedRecipe.sodium_mg} mg` : "—"}</div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
