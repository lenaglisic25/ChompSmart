import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const FavoritesContext = createContext(null);

function safeGetUserEmail() {
  try {
    return localStorage.getItem("currentUserEmail") || "guest";
  } catch {
    return "guest";
  }
}

function storageKeyForUser(userEmail) {
  return `chompsmart:favorites:recipes:${userEmail}`;
}

function getRecipeId(recipe) {
  // backend id
  if (recipe?.id != null) return String(recipe.id);
  // Fallback stable key
  return `${recipe?.category || "uncat"}::${recipe?.title || "untitled"}`;
}

export function FavoritesProvider({ children }) {
  const userEmail = safeGetUserEmail();
  const storageKey = storageKeyForUser(userEmail);

  const [favoriteMap, setFavoriteMap] = useState({}); // { [id]: recipeObject }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      setFavoriteMap(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      setFavoriteMap({});
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(favoriteMap));
    } catch {
      // ignore
    }
  }, [storageKey, favoriteMap]);

  const value = useMemo(() => {
    const isFavorite = (recipe) => {
      const id = getRecipeId(recipe);
      return Boolean(favoriteMap[id]);
    };

    const toggleFavorite = (recipe) => {
      const id = getRecipeId(recipe);
      setFavoriteMap((prev) => {
        const copy = { ...prev };
        if (copy[id]) delete copy[id];
        else copy[id] = recipe;
        return copy;
      });
    };

    const favoritesList = Object.values(favoriteMap);

    return { isFavorite, toggleFavorite, favoritesList };
  }, [favoriteMap]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}