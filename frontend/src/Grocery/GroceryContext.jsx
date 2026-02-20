import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const GroceryContext = createContext(null);
const STORAGE_KEY = "chompsmart_grocery_v2";

function safeLoad() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function GroceryProvider({ children }) {
  const [items, setItems] = useState(safeLoad);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const api = useMemo(() => {
    function addItem(name, qty = 1, category = "Other") {
      const cleanName = String(name || "").trim();
      if (!cleanName) return;

      const cleanCategory = String(category || "Other").trim() || "Other";
      const cleanQty = Number(qty);
      const finalQty = Number.isFinite(cleanQty) && cleanQty > 0 ? cleanQty : 1;

      const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());

      setItems((prev) => [
        { id, name: cleanName, qty: finalQty, category: cleanCategory, purchased: false },
        ...prev,
      ]);
    }

    function removeItem(id) {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }

    function togglePurchased(id) {
      setItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, purchased: !x.purchased } : x))
      );
    }

    function updateItem(id, updates) {
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...updates } : x)));
    }

    function clearPurchased() {
      setItems((prev) => prev.filter((x) => !x.purchased));
    }

    function clearAll() {
      setItems([]);
    }

    return {
      items,
      addItem,
      removeItem,
      togglePurchased,
      updateItem,
      clearPurchased,
      clearAll,
    };
  }, [items]);

  return <GroceryContext.Provider value={api}>{children}</GroceryContext.Provider>;
}

export function useGrocery() {
  const ctx = useContext(GroceryContext);
  if (!ctx) throw new Error("useGrocery must be used inside <GroceryProvider>");
  return ctx;
}