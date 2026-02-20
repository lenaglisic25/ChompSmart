import { useMemo, useState } from "react";
import { useGrocery } from "./GroceryContext";
import "./grocery.css";

export default function GroceryDrawer({ open, onClose }) {
  const { items, addItem, removeItem, togglePurchased, clearPurchased, clearAll } = useGrocery();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");

  const { active, done } = useMemo(() => {
    const active = items.filter((x) => !x.purchased);
    const done = items.filter((x) => x.purchased);
    return { active, done };
  }, [items]);

  function submit(e) {
    e.preventDefault();
    addItem(name, qty);
    setName("");
    setQty("1");
  }

  return (
    <div className={`gDrawerOverlay ${open ? "open" : ""}`} onMouseDown={onClose}>
      <aside className={`gDrawer ${open ? "open" : ""}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="gHeader">
          <div>
            <div className="gTitle">Grocery List</div>
            <div className="gSub">{active.length} to buy • {done.length} purchased</div>
          </div>
          <button className="gIconBtn" onClick={onClose} type="button">✕</button>
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
          <button className="gPrimaryBtn" type="submit">Add</button>
        </form>

        <div className="gSection">
          <div className="gSectionTitle">To Buy</div>
          {active.length === 0 ? (
            <div className="gEmpty">No items yet.</div>
          ) : (
            <ul className="gList">
              {active.map((x) => (
                <li key={x.id} className="gItem">
                  <label className="gItemLeft">
                    <input
                      type="checkbox"
                      checked={x.purchased}
                      onChange={() => togglePurchased(x.id)}
                    />
                    <span className="gItemText">
                      <span className="gName">{x.name}</span>
                      <span className="gMeta">Qty: {x.qty}</span>
                    </span>
                  </label>
                  <button className="gDangerBtn" type="button" onClick={() => removeItem(x.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="gSection">
          <div className="gSectionTitle">Purchased</div>
          {done.length === 0 ? (
            <div className="gEmpty">Nothing purchased yet.</div>
          ) : (
            <ul className="gList">
              {done.map((x) => (
                <li key={x.id} className="gItem purchased">
                  <label className="gItemLeft">
                    <input
                      type="checkbox"
                      checked={x.purchased}
                      onChange={() => togglePurchased(x.id)}
                    />
                    <span className="gItemText">
                      <span className="gName">{x.name}</span>
                      <span className="gMeta">Qty: {x.qty}</span>
                    </span>
                  </label>
                  <button className="gDangerBtn" type="button" onClick={() => removeItem(x.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
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