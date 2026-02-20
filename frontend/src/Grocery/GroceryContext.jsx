import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const GroceryContext = createContext(null);
const STORAGE_KEY = "chompsmart_grocery_v1";

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
    function addItem(name, qty = 1) {
      const clean = String(name || "").trim();
      if (!clean) return;

      const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());

      setItems((prev) => [
        { id, name: clean, qty: Number(qty) || 1, purchased: false },
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

    function clearPurchased() {
      setItems((prev) => prev.filter((x) => !x.purchased));
    }

    function clearAll() {
      setItems([]);
    }

    return { items, addItem, removeItem, togglePurchased, clearPurchased, clearAll };
  }, [items]);

  return <GroceryContext.Provider value={api}>{children}</GroceryContext.Provider>;
}

export function useGrocery() {
  const ctx = useContext(GroceryContext);
  if (!ctx) throw new Error("useGrocery must be used inside <GroceryProvider>");
  return ctx;
}