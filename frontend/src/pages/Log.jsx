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
function TopDashboard({ user }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetch(`http://localhost:8000/profile/${user}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProfile(data))
      .catch((err) => console.error("Profile fetch failed:", err));
  }, [user]);

  // connect to calorie goals, default to 2100
  const goals = { calories: Number(profile?.calorie_goal ?? 2100),
    protein: 95,
    sodiumMg: 2300,
    fluidsL: 3.0,
  };

  const metrics = {
    calories: 0,
    protein: 0,
    sodiumMg: 0,
    fluidsL: 0,
    streakDays: 0,
    weeklyAvgCalories: 0,
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
            <div className="tdGoalLine">Cals: {metrics.calories}/{goals.calories}</div>
            <div className="tdGoalLine">Carbs: 0/275g</div>
            <div className="tdGoalLine">Protein: {metrics.protein}/{goals.protein}g</div>
            <div className="tdGoalLine">Fats: 0/90g</div>
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
  const email = localStorage.getItem("currentUserEmail");
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

  function addItem(mealKey) {
    const value = (inputValues[mealKey] || "").trim();
    if (!value) return;
    setMeals((prev) => ({ ...prev, [mealKey]: [...prev[mealKey], value] }));
    setInput(mealKey, "");
    setExpandedSection(null);
    logMealToBackend(mealKey, value);
  }

  function removeItem(mealKey, index) {
    setMeals((prev) => ({
      ...prev,
      [mealKey]: prev[mealKey].filter((_, i) => i !== index),
    }));
  }

  return (
    <div className="logPage">
      <div className="logContent">
        <div className="logWidgetPlaceholder">
          <TopDashboard user={email} />
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

