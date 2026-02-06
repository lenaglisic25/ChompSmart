import React, { useMemo, useState } from "react";
import "./Learn.css";

export default function Learn() {
  const [tab, setTab] = useState("videos"); // "videos" | "recipes"

  const videos = useMemo(
    () => [
      {
        id: 1,
        title: "10 Low-Calorie Foods You Can Eat Every Day Without Gaining Weight",
        author: "John Doe Loves Cooking",
      },
      {
        id: 2,
        title: "High-Protein, Low-Calorie Meals for Busy Days",
        author: "John Doe Loves Cooking",
      },
      {
        id: 3,
        title: "These Low-Calorie Foods Feel Illegal",
        author: "John Doe Loves Cooking",
      },
      {
        id: 4,
        title: "This High-Protein Meal Takes Only 10 Minutes to Make",
        author: "John Doe Loves Cooking",
      },
      {
        id: 5,
        title: "5 Snacks I Would Stay Away From, and 5 Snacks I Eat Every Day",
        author: "John Doe Loves Cooking",
      },
    ],
    []
  );

  const recipes = useMemo(
    () => [
      {
        id: 1,
        title: "Low Calorie Baked Chicken Parmesan",
        cta: "Click here to Learn More",
        minutes: 40,
        servings: 8,
        calories: 558,
        img: "/recipe1.jpg",
      },
      {
        id: 2,
        title: "Healthy Omelette Recipe",
        cta: "Click here to Learn More",
        minutes: 10,
        servings: 1,
        calories: 457.9,
        img: "/recipe2.jpg",
        note: "This is recommended by Chompy based on how far you are from your eating goal.",
      },
      {
        id: 3,
        title: "Lemon & Green Bean Pasta",
        cta: "Click here to Learn More",
        minutes: 25,
        servings: 4,
        calories: 379,
        img: "/recipe3.jpg",
      },
      {
        id: 4,
        title: "Oven-Baked Salmon",
        cta: "Click here to Learn More",
        minutes: 25,
        servings: 4,
        calories: 911,
        img: "/recipe4.jpg",
      },
    ],
    []
  );

  return (
    <div className="learnPage">


      {/* Title + Tabs */}
      <div className="learnHeader">
        <div className="learnTitle">Discover New Recipes</div>

        <div className="learnTabs">
          <button
            type="button"
            className={`learnTab ${tab === "videos" ? "active" : ""}`}
            onClick={() => setTab("videos")}
          >
            Videos
          </button>
          <button
            type="button"
            className={`learnTab ${tab === "recipes" ? "active" : ""}`}
            onClick={() => setTab("recipes")}
          >
            Recipes
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="learnBody">
        {tab === "videos" ? (
          <div className="learnVideoList">
            {videos.map((v) => (
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
        ) : (
          <div className="learnRecipeList">
            {recipes.map((r) => (
              <div key={r.id} className="learnRecipeRow">
                <div className="learnRecipeImgWrap">
                  <img
                    className="learnRecipeImg"
                    src={r.img}
                    alt={r.title}
                    onError={(e) => {

                      e.currentTarget.style.display = "none";
                      e.currentTarget.parentElement.classList.add("fallback");
                    }}
                  />
                </div>

                <div className="learnRecipeMid">
                  <div className="learnRecipeTitle">{r.title}</div>
                  <div className="learnRecipeCTA">{r.cta}</div>
                  {r.note && <div className="learnRecipeNote">{r.note}</div>}
                </div>

                <div className="learnRecipeMeta">
                  <div className="learnMetaRow">
                    <span className="learnMetaIcon">⏱</span>
                    <span>{r.minutes} mins</span>
                  </div>
                  <div className="learnMetaRow">
                    <span className="learnMetaIcon">🍽</span>
                    <span>{r.servings} servings</span>
                  </div>
                  <div className="learnMetaRow">
                    <span className="learnMetaIcon">🔥</span>
                    <span>{r.calories} Calories</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
