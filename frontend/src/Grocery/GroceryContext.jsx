import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const GroceryContext = createContext(null);

function normalizeItem(raw) {
  return {
    ...raw,
    unit: raw.unit ?? "",
    purchased: raw.purchased ?? raw.is_purchased ?? false,
  };
}

export function GroceryProvider({ children }) {
  const email = localStorage.getItem("currentUserEmail") || "guest";
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (email === "guest") return;
    fetch(`http://localhost:8000/grocery/${email}`)
      .then((res) => res.json())
      .then((data) => setItems(data.map(normalizeItem)))
      .catch(() => {});
  }, [email]);

  const api = useMemo(() => {
    async function addItem(name, qty = 1, category = "Other", unit = "") {
      const cleanName = String(name || "").trim();
      if (!cleanName) return;

      const cleanCategory = String(category || "Other").trim() || "Other";
      const cleanUnit = String(unit || "").trim();
      const cleanQty = Number(qty);
      const finalQty = Number.isFinite(cleanQty) && cleanQty > 0 ? cleanQty : 1;

      const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());

      setItems((prev) => [
        { id, name: cleanName, qty: finalQty, unit: cleanUnit, category: cleanCategory, purchased: false },
        ...prev,
      ]);

      try {
        const res = await fetch("http://localhost:8000/grocery/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_email: email, name: cleanName, qty: finalQty, unit: cleanUnit, category: cleanCategory }),
        });
        if (!res.ok) throw new Error();
        const dbItem = await res.json();
        setItems((prev) => {
          const tempStillExists = prev.some((x) => x.id === id);
          if (!tempStillExists) {
            fetch(`http://localhost:8000/grocery/${dbItem.id}`, { method: "DELETE" }).catch(() => {});
            return prev.filter((x) => x.id !== dbItem.id);
          }
          return [normalizeItem(dbItem), ...prev.filter((x) => x.id !== dbItem.id && x.id !== id)];
        });
      } catch {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }
    }

    async function removeItem(id) {
      setItems((prev) => prev.filter((x) => x.id !== id));
      try {
        await fetch(`http://localhost:8000/grocery/${id}`, { method: "DELETE" });
      } catch {}
    }

    async function togglePurchased(id) {
      const item = items.find((x) => x.id === id);
      if (!item) return;

      setItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, purchased: !x.purchased } : x))
      );

      try {
        await fetch(`http://localhost:8000/grocery/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_purchased: !item.purchased }),
        });
      } catch {}
    }

    async function updateItem(id, updates) {
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...updates } : x)));
      try {
        await fetch(`http://localhost:8000/grocery/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
      } catch {}
    }

    async function clearPurchased() {
      const toDelete = items.filter((x) => x.purchased);
      setItems((prev) => prev.filter((x) => !x.purchased));
      try {
        await Promise.all(toDelete.map((x) => fetch(`http://localhost:8000/grocery/${x.id}`, { method: "DELETE" })));
      } catch {}
    }

    async function clearAll() {
      const toDelete = items;
      setItems([]);
      try {
        await Promise.all(toDelete.map((x) => fetch(`http://localhost:8000/grocery/${x.id}`, { method: "DELETE" })));
      } catch {}
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
  }, [items, email]);

  return <GroceryContext.Provider value={api}>{children}</GroceryContext.Provider>;
}

export function useGrocery() {
  const ctx = useContext(GroceryContext);
  if (!ctx) throw new Error("useGrocery must be used inside <GroceryProvider>");
  return ctx;
}
