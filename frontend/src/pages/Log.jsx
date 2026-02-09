import { useEffect, useMemo, useState } from "react";
import "./Log.css";



function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
function pct(current, goal) {
  if (!goal || goal <= 0) return 0;
  return clamp01(current / goal);
}

function goalStatus(p) {
  if (p >= 1) return "good";
  if (p >= 0.75) return "warn";
  return "bad";
}

function limitStatus(p) {
  if (p <= 0.6) return "good";
  if (p <= 0.9) return "warn";
  return "bad";
}

function Ring({ title, subtitle, current, goal, mode = "goal" }) {
  const p = pct(current, goal);
  const status = mode === "limit" ? limitStatus(p) : goalStatus(p);

  const size = 92;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * p;

  return (
    <div className="tdRing">
      <svg width={size} height={size} className="tdRingSvg">
        <circle className="tdRingTrack" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className={`tdRingFill ${status}`}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>

      <div className="tdRingText">
        <div className="tdRingTitle">{title}</div>
        <div className="tdRingSub">{subtitle}</div>
      </div>
    </div>
  );
}

// (yavna) Update dashboard to fetch data
function TopDashboard({ userEmail, refreshKey }) {
  const [profile, setProfile] = useState(null);

  const [metrics, setMetrics] = useState({
    calories: 0,
    protein: 0,
    fluidsL: 0,
    streakDays: 0,
    weeklyAvgCalories: 0,
  });

  useEffect(() => {
    if (!userEmail) return;
    fetch(`http://localhost:8000/profile/${userEmail}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProfile(data))
      .catch((err) => console.error("Profile fetch failed:", err));
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;

    fetch(`http://localhost:8000/meals/today?user_email=${userEmail}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((meals) => {
        const totalCals = meals.reduce((acc, item) => acc + (Number(item.calories) || 0), 0);
        const totalProt = meals.reduce((acc, item) => acc + (Number(item.protein) || 0), 0);
        const totalFluids = meals.reduce((acc, item) => acc + (Number(item.fluids) || 0), 0);

        setMetrics(prev => ({
          ...prev,
          calories: totalCals,
          protein: totalProt,
          fluidsL: totalFluids
        }));
      })
      .catch((err) => console.error("Metrics fetch failed:", err));
  }, [userEmail, refreshKey]);

  // connect to calorie goals, default to 2100
  const goals = {
    calories: Number(profile?.calorie_goal ?? 2100),
    protein: 95,
    carbs: 275,
    fats: 90,
    fluidsL: 3.0,
  };

  const remainingCalories = Math.max(0, goals.calories - metrics.calories);

  const alerts = useMemo(() => {
    return [
      { level: "warn", text: "Hydration is low — drink water to reach 3L." },
      { level: "warn", text: "Protein is low — try adding a high-protein food." },
      { level: "good", text: "Nice start — keep logging meals to build your streak." },
    ];
  }, []);

  const [slide, setSlide] = useState(0);

  const slides = [
    {
      key: "dot1",
      content: (
        <div className="tdCardsRow">
          <div className="tdMiniCard">
            <Ring
              title={`${remainingCalories}`}
              subtitle="Cals Remaining"
              current={remainingCalories}
              goal={goals.calories}
              mode="goal"
            />
          </div>

       <div className="tdMiniCard tdGoalCard">
  <div className="tdGoalTitle">Goal</div>
  <div className="tdGoalLine">Carbs: 0/275g</div>
  <div className="tdGoalLine">Protein: {metrics.protein}/{goals.protein}g</div>
  <div className="tdGoalLine">Fats: 0/90g</div>
  <div className="tdGoalLine">Fiber: {Math.round(metrics.fiber)}/{goals.fiber}g</div>
</div>



          <div className="tdMiniCard tdHydCard">
            <div className="tdHydTitle">Hydration</div>
            <div className="tdHydLine">
              Fluids: {metrics.fluidsL.toFixed(1)}/{goals.fluidsL.toFixed(1)}L
            </div>
            <div className="tdHydCheer">
              Only {(goals.fluidsL - metrics.fluidsL).toFixed(1)}L more to go, you got this!
            </div>
          </div>
        </div>
      ),
    },

    {
      key: "dot2",
      content: (
        <div className="tdSecondGrid">
          {/* GATOR + SPEECH BUBBLE */}
          <div className="tdMiniCard tdMascotCard">
            <div className="tdMascotWrap">
              <img
                src="/gator.png"
                alt="ChompSmart gator"
                className="tdGatorImg"
              />

              <div className="tdSpeechBubble">
                You are doing great! Keep logging to keep up the progress!
                <span className="tdSpeechTail" />
              </div>
            </div>
          </div>

          {/* STREAK */}
          <div className="tdMiniCard tdCenterRing">
            <Ring
              title={`${metrics.streakDays}`}
              subtitle="Day Streak"
              current={metrics.streakDays}
              goal={7}
              mode="goal"
            />
            <div className="tdCenterRingSub">Log one meal today to increase your streak</div>
          </div>

          {/* WEEKLY AVG */}
          <div className="tdMiniCard tdCenterRing">
            <Ring
              title={`${metrics.weeklyAvgCalories}`}
              subtitle="Weekly Avg Cals"
              current={metrics.weeklyAvgCalories}
              goal={goals.calories}
              mode="limit"
            />
            <div className="tdCenterRingSub">Goal: {goals.calories} cals</div>
          </div>

          {/* ALERTS */}
          <div className="tdMiniCard tdAlertsBox">
            <div className="tdAlertsTitle">Alerts</div>
            {alerts.length === 0 ? (
              <div className="tdAlertItem good">No alerts right now. Keep going!</div>
            ) : (
              alerts.map((a, i) => (
                <div key={i} className={`tdAlertItem ${a.level}`}>
                  {a.text}
                </div>
              ))
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="tdOuter">
      <div className="tdWidget">
        <div className="tdInner">{slides[slide].content}</div>

        <div className="tdDots">
          {slides.map((s, idx) => (
            <button
              key={s.key}
              type="button"
              className={`tdDot ${idx === slide ? "active" : ""}`}
              onClick={() => setSlide(idx)}
              aria-label={`dashboard slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}



const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snacks"];
const MEAL_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

async function logMealToBackend(mealType, foodName) {
  const email = localStorage.getItem("currentUserEmail");

  const searchRes = await fetch(
    `http://localhost:8000/usda/search?query=${encodeURIComponent(foodName)}`
  );

  const foods = await searchRes.json();
  if (!foods.length) return null;

  const f = foods[0];

  const response = await fetch("http://localhost:8000/meals/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_email: email,
      meal_type: mealType,
      food_name: f.description,

      calories: Number(f.calories || 0),
      protein: Number(f.protein || 0),
      carbs: Number(f.carbohydrates || 0),
      fats: Number(f.fats || 0),
    }),
  });

  return await response.json();
}

// (yavna) added clear backend meals function for testing
async function clearBackendMeals() {
  const email = localStorage.getItem("currentUserEmail");
  await fetch(`http://localhost:8000/meals/reset?user_email=${email}`, {
    method: "DELETE",
  });
}

function getSectionForEmptySuggestion(meals) {
  if (!meals.breakfast || meals.breakfast.length === 0) return "breakfast";
  if (!meals.lunch || meals.lunch.length === 0) return "lunch";
  if (!meals.dinner || meals.dinner.length === 0) return "dinner";
  return null;
}

export default function Log() {
  const email = localStorage.getItem("currentUserEmail");
  const [refreshKey, setRefreshKey] = useState(0);
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
    setExpandedSection(expandedSection === mealKey ? null : mealKey);
  }

  function setInput(mealKey, value) {
    setInputValues((prev) => ({ ...prev, [mealKey]: value }));
  }

  async function addItem(mealKey) {
    const value = (inputValues[mealKey] || "").trim();
    if (!value) return;

    setInput(mealKey, "");
    setExpandedSection(null);

    // (yavna) connect meal id so that it can be deleted from database
    const result = await logMealToBackend(mealKey, value);

    if (result && result.ok && result.id) {
        const newItem = { name: value, id: result.id };
        setMeals((prev) => ({ ...prev, [mealKey]: [...prev[mealKey], newItem] }));

        setRefreshKey((k) => k + 1);
    }
  }

  async function removeItem(mealKey, index) {
    const itemToRemove = meals[mealKey][index];

    setMeals((prev) => ({
      ...prev,
      [mealKey]: prev[mealKey].filter((_, i) => i !== index),
    }));


    // (yavna) delete from backend
    if (itemToRemove && itemToRemove.id) {
        await fetch(`http://localhost:8000/meals/${itemToRemove.id}`, {
            method: "DELETE"
        });
        setRefreshKey((k) => k + 1);
    }
  }

  // (yavna) clear log
  async function handleClearAll() {
    if(!window.confirm("Are you sure you want to clear your meal log?")) return;

    await clearBackendMeals();

    setMeals({
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
    });

    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="logPage">
      <div className="logContent">
        <div className="logWidgetPlaceholder">
          <TopDashboard userEmail={email} refreshKey={refreshKey} />
        </div>
        {/* RESET BUTTON * (yavna) (change this to match style)*/ }
        <div style={{ textAlign: 'right', marginBottom: '10px' }}>
             <button
                onClick={handleClearAll}
                style={{
                    background: 'none',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '5px 10px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: '#666'
                }}
             >
                 Reset Log
             </button>
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
                    <button type="button" className="logOkBtn" onClick={() => addItem(mealKey)}>
                      Add
                    </button>
                  </div>
                )}

                {items.length > 0 && (
                  <ul className="logItemList">
                    {items.map((item, i) => (
                      <li key={`${mealKey}-${i}`} className="logItem">
                        <span className="logItemName">{item.name}</span>
                        <button
                          type="button"
                          className="logItemRemove"
                          onClick={() => removeItem(mealKey, i)}
                          aria-label={`Remove ${item.name}`}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {showSuggestion && (
                  <div className="logEmptyState">
                    I see you have not logged a {mealLabelLower} today. If you are stuck on what you
                    want, can I suggest: <strong>Meal Example</strong>
                    <br />
                    <span className="logTutorialLink" role="button" tabIndex={0}>
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

