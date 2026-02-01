import { useState } from "react";
import "./Log.css";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snacks"];
const MEAL_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

function logMealToBackend(mealType, foodName) {
  console.log("logMealToBackend", { mealType, foodName });
}

function getSectionForEmptySuggestion(meals) {
  if (!meals.breakfast || meals.breakfast.length === 0) return "breakfast";
  if (!meals.lunch || meals.lunch.length === 0) return "lunch";
  if (!meals.dinner || meals.dinner.length === 0) return "dinner";
  return null;
}

export default function Log() {
  const [meals, setMeals] = useState({
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  });
  const [expandedSection, setExpandedSection] = useState(null);
  const [inputValues, setInputValues] = useState({
    breakfast: "",
    lunch: "",
    dinner: "",
    snacks: "",
  });

  const suggestionSection = getSectionForEmptySuggestion(meals);

  function toggleExpand(mealKey) {
    if (expandedSection === mealKey) {
      setExpandedSection(null);
    } else {
      setExpandedSection(mealKey);
    }
  }

  function setInput(mealKey, value) {
    const next = { ...inputValues };
    next[mealKey] = value;
    setInputValues(next);
  }

  function addItem(mealKey) {
    const value = (inputValues[mealKey] || "").trim();
    if (!value) return;
    const newMeals = { ...meals };
    newMeals[mealKey] = [...meals[mealKey], value];
    setMeals(newMeals);
    setInput(mealKey, "");
    setExpandedSection(null);
    logMealToBackend(mealKey, value);
  }

  function removeItem(mealKey, index) {
    const newMeals = { ...meals };
    newMeals[mealKey] = meals[mealKey].filter((item, i) => i !== index);
    setMeals(newMeals);
  }

  return (
    <div className="logPage">
      <div className="logContent">
        <div className="logWidgetPlaceholder" aria-hidden="true">
          Space for tracking widget.
        </div>

        <div className="logCard">
          {MEAL_ORDER.map((mealKey) => {
          const label = MEAL_LABELS[mealKey];
          const items = meals[mealKey] || [];
          const isExpanded = expandedSection === mealKey;
          const showSuggestion = suggestionSection === mealKey;
          const mealLabelLower = label.toLowerCase();

          return (
            <section key={mealKey} className="logSection">
              <h2 className="logSectionTitle">{label}</h2>

              <div className="logAddRow">
                <button
                  type="button"
                  className="logAddBtn"
                  onClick={() => toggleExpand(mealKey)}
                  aria-label={`Log ${mealLabelLower}`}
                >
                  +
                </button>
                <span
                  className="logAddPrompt"
                  onClick={() => toggleExpand(mealKey)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") toggleExpand(mealKey);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  Log your {mealLabelLower} here
                </span>
              </div>

              {isExpanded && (
                <div className="logInputRow">
                  <input
                    type="text"
                    className="logInput"
                    placeholder="Food name"
                    value={inputValues[mealKey] || ""}
                    onChange={(e) => setInput(mealKey, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addItem(mealKey);
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="logOkBtn"
                    onClick={() => addItem(mealKey)}
                  >
                    Add
                  </button>
                </div>
              )}

              {items.length > 0 && (
                <ul className="logItemList">
                  {items.map((name, i) => (
                    <li key={`${mealKey}-${i}`} className="logItem">
                      <span className="logItemName">{name}</span>
                      <button
                        type="button"
                        className="logItemRemove"
                        onClick={() => removeItem(mealKey, i)}
                        aria-label={`Remove ${name}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {showSuggestion && (
                <div className="logEmptyState">
                  I see you have not logged a {mealLabelLower} today. If you are
                  stuck on what you want, can I suggest: <strong>Meal Example</strong>
                  <br />
                  <span
                    className="logTutorialLink"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") e.preventDefault();
                    }}
                  >
                    Click here for a step by step tutorial for the Meal Example
                  </span>
                </div>
              )}
            </section>
          );
          })}
        </div>
      </div>
    </div>
  );
}
