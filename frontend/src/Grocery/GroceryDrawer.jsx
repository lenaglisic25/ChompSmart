import { useMemo, useState } from "react";
import { useGrocery } from "./GroceryContext";
import "./grocery.css";

const CATEGORY_ORDER = [
  "Produce",
  "Meat/Seafood",
  "Dairy",
  "Bakery",
  "Pantry",
  "Frozen",
  "Beverages",
  "Other",
];

function normalizeCategory(cat) {
  const c = String(cat || "").trim();
  if (!c) return "Other";
  return CATEGORY_ORDER.includes(c) ? c : "Other";
}

export default function GroceryDrawer({ open, onClose }) {
  const { items, addItem, removeItem, togglePurchased, updateItem, clearPurchased, clearAll } =
    useGrocery();


  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [category, setCategory] = useState("Produce");


  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editCategory, setEditCategory] = useState("Other");

  const counts = useMemo(() => {
    const active = items.filter((x) => !x.purchased).length;
    const done = items.filter((x) => x.purchased).length;
    return { active, done };
  }, [items]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const c of CATEGORY_ORDER) map.set(c, []);

    for (const item of items) {
      const c = normalizeCategory(item.category);
      map.get(c).push(item);
    }

    for (const [c, arr] of map.entries()) {
      arr.sort((a, b) => {
        const ap = a.purchased ? 1 : 0;
        const bp = b.purchased ? 1 : 0;
        if (ap !== bp) return ap - bp;
        return String(a.name).localeCompare(String(b.name));
      });
    }

    return map;
  }, [items]);

  function submit(e) {
    e.preventDefault();
    addItem(name, qty, category);
    setName("");
    setQty("1");
    setCategory("Produce");
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditName(item.name ?? "");
    setEditQty(String(item.qty ?? 1));
    setEditCategory(normalizeCategory(item.category));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditQty("");
    setEditCategory("Other");
  }

  function saveEdit(id) {
    const cleanName = String(editName || "").trim();
    if (!cleanName) return;

    const q = Number(editQty);
    const finalQty = Number.isFinite(q) && q > 0 ? q : 1;

    updateItem(id, {
      name: cleanName,
      qty: finalQty,
      category: normalizeCategory(editCategory),
    });

    cancelEdit();
  }

  function renderItem(item) {
    const isEditing = editingId === item.id;

    return (
      <li key={item.id} className={`gItem ${item.purchased ? "purchased" : ""}`}>
        <div className="gItemLeft">
          <input type="checkbox" checked={!!item.purchased} onChange={() => togglePurchased(item.id)} />

          {!isEditing ? (
            <span className="gItemText">
              <span className="gName">{item.name}</span>
              <span className="gMeta">Qty: {item.qty}</span>
            </span>
          ) : (
            <div className="gEditGrid">
              <input className="gInput" value={editName} onChange={(e) => setEditName(e.target.value)} />
              <input
                className="gInput"
                value={editQty}
                onChange={(e) => setEditQty(e.target.value)}
                inputMode="decimal"
              />
              <select className="gInput" value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!isEditing ? (
          <div className="gActions">
            <button
              className="gSecondaryBtn gSmallBtn"
              type="button"
              onClick={() => startEdit(item)}
            >
              Edit
            </button>
            <button className="gDangerBtn" type="button" onClick={() => removeItem(item.id)}>
              Remove
            </button>
          </div>
        ) : (
          <div className="gActions">
            <button className="gPrimaryBtn gSmallBtn" type="button" onClick={() => saveEdit(item.id)}>
              Save
            </button>
            <button className="gSecondaryBtn gSmallBtn" type="button" onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        )}
      </li>
    );
  }

  return (
    <div className={`gDrawerOverlay ${open ? "open" : ""}`} onMouseDown={() => (editingId ? null : onClose())}>
      <aside className={`gDrawer ${open ? "open" : ""}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="gHeader">
          <div>
            <div className="gTitle">Grocery List</div>
            <div className="gSub">
              {counts.active} to buy • {counts.done} purchased
            </div>
          </div>
          <button className="gIconBtn" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form className="gForm" onSubmit={submit}>
          <input
            className="gInput"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add item (ex: eggs)"
          />
          <input
            className="gInput"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Qty"
            inputMode="decimal"
          />
          <select className="gInput" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button className="gPrimaryBtn" type="submit">
            Add
          </button>
        </form>

        <div className="gSection">
          {CATEGORY_ORDER.map((cat) => {
            const list = grouped.get(cat) || [];
            if (list.length === 0) return null;

            return (
              <div key={cat} className="gCategoryBlock">
                <div className="gCategoryTitle">{cat}</div>
                <ul className="gList">{list.map(renderItem)}</ul>
              </div>
            );
          })}

          {items.length === 0 ? <div className="gEmpty">No items yet.</div> : null}
        </div>

        <div className="gFooter">
          <button className="gSecondaryBtn" type="button" onClick={clearPurchased}>
            Clear Purchased
          </button>
          <button className="gSecondaryBtn" type="button" onClick={clearAll}>
            Clear All
          </button>
        </div>
      </aside>
    </div>
  );
}