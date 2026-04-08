import { useEffect, useMemo, useRef, useState } from "react";
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

function ozToLiters(oz) {
  return Number(oz || 0) * 0.0295735;
}

function getWaterStorageKey(email, date) {
  return `chompsmart_water_${email}_${date}`;
}

function loadWaterForDay(email, date) {
  try {
    const raw = localStorage.getItem(getWaterStorageKey(email, date));
    if (!raw) {
      return {
        goalOz: 64,
        cupOz: 8,
        bottleOz: 24,
        totalOz: 0,
        history: [],
      };
    }
    const parsed = JSON.parse(raw);
    return {
      goalOz: Number(parsed.goalOz) || 64,
      cupOz: Number(parsed.cupOz) || 8,
      bottleOz: Number(parsed.bottleOz) || 24,
      totalOz: Number(parsed.totalOz) || 0,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return {
      goalOz: 64,
      cupOz: 8,
      bottleOz: 24,
      totalOz: 0,
      history: [],
    };
  }
}

function saveWaterForDay(email, date, payload) {
  localStorage.setItem(getWaterStorageKey(email, date), JSON.stringify(payload));
}

function getWeightStorageKey(email) {
  return `chompsmart_weight_${email}`;
}

function loadWeightEntries(email) {
  try {
    const raw = localStorage.getItem(getWeightStorageKey(email));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWeightEntries(email, entries) {
  localStorage.setItem(getWeightStorageKey(email), JSON.stringify(entries));
}

function getTrackerSettingsKey(email) {
  return `chompsmart_tracker_settings_${email}`;
}

function loadTrackerSettings(email) {
  try {
    const raw = localStorage.getItem(getTrackerSettingsKey(email));
    if (!raw) {
      return {
        reminderEnabled: false,
        reminderFrequency: "daily",
        lastReminderAt: 0,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      reminderEnabled: Boolean(parsed.reminderEnabled),
      reminderFrequency: parsed.reminderFrequency || "daily",
      lastReminderAt: Number(parsed.lastReminderAt) || 0,
    };
  } catch {
    return {
      reminderEnabled: false,
      reminderFrequency: "daily",
      lastReminderAt: 0,
    };
  }
}

function saveTrackerSettings(email, settings) {
  localStorage.setItem(getTrackerSettingsKey(email), JSON.stringify(settings));
}

function frequencyToMs(freq) {
  if (freq === "twice_daily") return 12 * 60 * 60 * 1000;
  if (freq === "weekly") return 7 * 24 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function formatWeightDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

function TopDashboard({ userEmail, refreshKey, formattedDate, waterOz = 0, waterGoalOz = 64 }) {
  const [profile, setProfile] = useState(null);

  const [metrics, setMetrics] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
    fluidsL: 0,
    streakDays: 0,
    weeklyAvgCalories: 0,
    sodiumMg: 0,
  });

  useEffect(() => {
    if (!userEmail) return;

    const fetchProfile = () => {
      fetch(`http://localhost:8000/profile/${encodeURIComponent(userEmail)}?t=${Date.now()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data != null) setProfile(data);
        })
        .catch((err) => console.error("Profile fetch failed:", err));
    };

    fetchProfile();
    
    // Poll for profile changes every 30 seconds
    const interval = setInterval(fetchProfile, 30000);
    return () => clearInterval(interval);
  }, [userEmail, refreshKey]);

  useEffect(() => {
    if (!userEmail || !formattedDate) return;

    fetch(`http://localhost:8000/meals/daily/${encodeURIComponent(userEmail)}?target_date=${formattedDate}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        let list = [];

        if (Array.isArray(data)) {
          list = data;
        } else if (typeof data === "object" && data !== null) {
          list = Object.values(data).flat();
        }

        const totalCals = list.reduce((acc, item) => acc + (Number(item.calories) || 0), 0);
        const totalProt = list.reduce((acc, item) => acc + (Number(item.protein) || 0), 0);
        const totalCarbs = list.reduce((acc, item) => acc + (Number(item.carbs) || 0), 0);
        const totalFats = list.reduce((acc, item) => acc + (Number(item.fats) || 0), 0);
        const totalFluids = list.reduce((acc, item) => acc + (Number(item.fluids) || 0), 0);
        const totalFiber = list.reduce((acc, item) => acc + (Number(item.fiber) || 0), 0);
        const totalSodium = list.reduce((acc, item) => acc + (Number(item.sodium) || 0), 0);

        setMetrics((prev) => ({
          ...prev,
          calories: totalCals,
          protein: totalProt,
          carbs: totalCarbs,
          fats: totalFats,
          fiber: totalFiber,
          sodiumMg: totalSodium,
          fluidsL: totalFluids,
        }));
      })
      .catch((err) => console.error("Metrics fetch failed:", err));
  }, [userEmail, refreshKey, formattedDate]);

  const goals = {
    calories: Number(profile?.calorie_goal ?? 2100),
    protein: Number(profile?.protein_g ?? 95),
    carbs: Number(profile?.carbs_g ?? 275),
    fats: Number(profile?.fats_g ?? 90),
    fiber: Number(profile?.fiber_g ?? 25),
    sodiumMg: 2300,
    fluidsL: ozToLiters(waterGoalOz) || 3.0,
  };

  const combinedFluidsL = Number(metrics.fluidsL || 0) + ozToLiters(waterOz);
  const remainingCalories = Math.max(0, goals.calories - metrics.calories);
  const remainingHydrationL = Math.max(0, goals.fluidsL - combinedFluidsL);

  const alerts = useMemo(() => {
    const output = [];

    if (combinedFluidsL < goals.fluidsL * 0.5) {
      output.push({ level: "warn", text: "Hydration is low — tap your cup or bottle to catch up." });
    }

    if (metrics.protein < goals.protein * 0.5) {
      output.push({ level: "warn", text: "Protein is low — try adding a high-protein food." });
    }

    if (metrics.sodiumMg > goals.sodiumMg * 0.9) {
      output.push({ level: "bad", text: "Sodium is getting high today — watch salty foods." });
    }

    if (output.length === 0) {
      output.push({ level: "good", text: "Nice progress today — keep going!" });
    }

    return output;
  }, [combinedFluidsL, goals.fluidsL, metrics.protein, goals.protein, metrics.sodiumMg, goals.sodiumMg]);

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
            <div className="tdGoalLine">Cals: {Math.round(metrics.calories)}/{Math.round(goals.calories)}</div>
            <div className="tdGoalLine">Carbs: {Math.round(metrics.carbs)}/{Math.round(goals.carbs)}g</div>
            <div className="tdGoalLine">Protein: {Math.round(metrics.protein)}/{Math.round(goals.protein)}g</div>
            <div className="tdGoalLine">Fats: {Math.round(metrics.fats)}/{Math.round(goals.fats)}g</div>
            <div className="tdGoalLine">Fiber: {Math.round(metrics.fiber)}/{Math.round(goals.fiber)}g</div>
            <div className="tdGoalLine">Sodium: {Math.round(metrics.sodiumMg)}/{Math.round(goals.sodiumMg)}mg</div>
          </div>

          <div className="tdMiniCard tdHydCard">
            <div className="tdHydTitle">Hydration</div>
            <div className="tdHydLine">
              Fluids: {combinedFluidsL.toFixed(1)}/{goals.fluidsL.toFixed(1)}L
            </div>
            <div className="tdHydLine">Water Tracker: {Math.round(waterOz)} oz</div>
            <div className="tdHydCheer">
              {remainingHydrationL > 0
                ? `Only ${remainingHydrationL.toFixed(1)}L more to go, you got this!`
                : "Hydration goal reached — amazing job!"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "dot2",
      content: (
        <div className="tdSecondGrid">
          <div className="tdMiniCard tdMascotCard">
            <div className="tdMascotWrap">
              <img src="/gator.png" alt="ChompSmart gator" className="tdGatorImg" />
              <div className="tdSpeechBubble">
                You are doing great! Keep logging to keep up the progress!
                <span className="tdSpeechTail" />
              </div>
            </div>
          </div>

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

          <div className="tdMiniCard tdCenterRing">
            <Ring
              title={`${Math.round(metrics.weeklyAvgCalories)}`}
              subtitle="Weekly Avg Cals"
              current={metrics.weeklyAvgCalories}
              goal={goals.calories}
              mode="limit"
            />
            <div className="tdCenterRingSub">Goal: {Math.round(goals.calories)} cals</div>
          </div>

          <div className="tdMiniCard tdAlertsBox">
            <div className="tdAlertsTitle">Alerts</div>
            {alerts.map((a, i) => (
              <div key={i} className={`tdAlertItem ${a.level}`}>
                {a.text}
              </div>
            ))}
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

function TrackerTabs({ activeTab, setActiveTab, children }) {
  return (
    <section className="trackerShell">
      <div className="trackerTabsRail">
        <button
          type="button"
          className={`trackerTabBtn ${activeTab === "water" ? "active" : ""}`}
          onClick={() => setActiveTab("water")}
        >
          <span className="trackerTabIcon">💧</span>
          <span className="trackerTabText">Water</span>
        </button>

        <button
          type="button"
          className={`trackerTabBtn ${activeTab === "weight" ? "active" : ""}`}
          onClick={() => setActiveTab("weight")}
        >
          <span className="trackerTabIcon">⚖️</span>
          <span className="trackerTabText">Weight</span>
        </button>
      </div>

      <div className="trackerPanel">{children}</div>
    </section>
  );
}

function WaterTrackerCompact({
  waterGoalOz,
  setWaterGoalOz,
  cupOz,
  setCupOz,
  bottleOz,
  setBottleOz,
  waterOz,
  addWater,
  undoWater,
  resetWater,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const progress = pct(waterOz, waterGoalOz);
  const remainingOz = Math.max(0, waterGoalOz - waterOz);
  const bottleFill = waterGoalOz > 0 ? Math.min(100, (waterOz / waterGoalOz) * 100) : 0;

  return (
    <section className="trackerCard waterCuteCard">
      <div className="trackerCardTop">
        <div>
          <div className="trackerEyebrow">Hydration</div>
          <h2 className="trackerTitle">Water Tracker</h2>
          <p className="trackerSubtitle">Smaller, cleaner, and easier to tap.</p>
        </div>

        <button
          type="button"
          className="trackerGhostBtn"
          onClick={() => setIsEditing((v) => !v)}
        >
          {isEditing ? "Done" : "Edit"}
        </button>
      </div>

      <div className="waterCuteSummary">
        <div className="waterCuteStat">
          <div className="waterCuteBig">
            {Math.round(waterOz)} <span>oz</span>
          </div>
          <div className="waterCuteMeta">Goal {Math.round(waterGoalOz)} oz</div>
        </div>

        <div className="waterBottleMini">
          <div className="waterBottleMiniCap" />
          <div className="waterBottleMiniBody">
            <div
              className="waterBottleMiniFill"
              style={{ height: `${Math.max(8, bottleFill)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="trackerProgress">
        <div
          className="trackerProgressFill waterProgressCute"
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </div>

      <div className="trackerMiniRow">
        <div className="trackerMiniPill">{Math.round(waterOz)} / {Math.round(waterGoalOz)} oz</div>
        <div className="trackerMiniPill">
          {remainingOz > 0 ? `${Math.round(remainingOz)} oz left` : "Goal reached"}
        </div>
      </div>

      {isEditing && (
        <div className="trackerEditGrid">
          <label className="trackerField">
            <span>Daily goal (oz)</span>
            <input
              type="number"
              min="1"
              value={waterGoalOz}
              onChange={(e) => setWaterGoalOz(Math.max(1, Number(e.target.value) || 64))}
            />
          </label>

          <label className="trackerField">
            <span>Cup size (oz)</span>
            <input
              type="number"
              min="1"
              value={cupOz}
              onChange={(e) => setCupOz(Math.max(1, Number(e.target.value) || 8))}
            />
          </label>

          <label className="trackerField">
            <span>Bottle size (oz)</span>
            <input
              type="number"
              min="1"
              value={bottleOz}
              onChange={(e) => setBottleOz(Math.max(1, Number(e.target.value) || 24))}
            />
          </label>
        </div>
      )}

      <div className="waterCuteActions">
        <button
          type="button"
          className="trackerPrimaryBtn"
          onClick={() => addWater(cupOz, "cup")}
        >
          + Cup ({cupOz} oz)
        </button>

        <button
          type="button"
          className="trackerPrimaryBtn"
          onClick={() => addWater(bottleOz, "bottle")}
        >
          + Bottle ({bottleOz} oz)
        </button>
      </div>

      <div className="trackerBottomRow">
        <button type="button" className="trackerGhostBtn" onClick={undoWater}>
          Undo
        </button>
        <button type="button" className="trackerGhostBtn" onClick={resetWater}>
          Reset
        </button>
      </div>
    </section>
  );
}

function WeightTracker({
  formattedDate,
  weightEntries,
  setWeightEntries,
  reminderEnabled,
  setReminderEnabled,
  reminderFrequency,
  setReminderFrequency,
}) {
  const todaysEntry = weightEntries.find((entry) => entry.date === formattedDate);
  const [inputWeight, setInputWeight] = useState(todaysEntry?.weight ?? "");

  useEffect(() => {
    const today = weightEntries.find((entry) => entry.date === formattedDate);
    setInputWeight(today?.weight ?? "");
  }, [formattedDate, weightEntries]);

  async function requestReminderPermission() {
    if (!("Notification" in window)) {
      alert("This browser does not support notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setReminderEnabled(true);
    }
  }

  function saveTodayWeight() {
    const value = Number(inputWeight);
    if (!value || value <= 0) return;

    setWeightEntries((prev) => {
      const filtered = prev.filter((entry) => entry.date !== formattedDate);
      const next = [...filtered, { date: formattedDate, weight: value }].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
      return next;
    });
  }

  function deleteTodayWeight() {
    setWeightEntries((prev) => prev.filter((entry) => entry.date !== formattedDate));
    setInputWeight("");
  }

  const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-7);

  const minWeight = recent.length ? Math.min(...recent.map((d) => d.weight)) : 0;
  const maxWeight = recent.length ? Math.max(...recent.map((d) => d.weight)) : 0;
  const range = Math.max(1, maxWeight - minWeight);

  return (
    <section className="trackerCard weightCuteCard">
      <div className="trackerCardTop">
        <div>
          <div className="trackerEyebrow">Progress</div>
          <h2 className="trackerTitle">Weight Tracker</h2>
          <p className="trackerSubtitle">Enter today’s weight and watch the trend build.</p>
        </div>
      </div>

      <div className="weightTopStats">
        <div className="weightMiniStat">
          <span>Today</span>
          <strong>{todaysEntry ? `${todaysEntry.weight}` : "—"}</strong>
        </div>
        <div className="weightMiniStat">
          <span>Entries</span>
          <strong>{weightEntries.length}</strong>
        </div>
        <div className="weightMiniStat">
          <span>Frequency</span>
          <strong>
            {reminderFrequency === "twice_daily"
              ? "2x day"
              : reminderFrequency === "weekly"
              ? "Weekly"
              : "Daily"}
          </strong>
        </div>
      </div>

      <div className="weightInputRow">
        <label className="trackerField weightField">
          <span>Today’s weight</span>
          <input
            type="number"
            step="0.1"
            min="1"
            placeholder="Enter weight"
            value={inputWeight}
            onChange={(e) => setInputWeight(e.target.value)}
          />
        </label>

        <button type="button" className="trackerPrimaryBtn" onClick={saveTodayWeight}>
          Save
        </button>
      </div>

      <div className="weightNotifCard">
        <div className="weightNotifTop">
          <div>
            <div className="weightNotifTitle">Daily notifications</div>
            <div className="weightNotifText">Change frequency whenever you want.</div>
          </div>

          {!reminderEnabled ? (
            <button type="button" className="trackerGhostBtn" onClick={requestReminderPermission}>
              Enable
            </button>
          ) : (
            <button
              type="button"
              className="trackerGhostBtn"
              onClick={() => setReminderEnabled(false)}
            >
              Off
            </button>
          )}
        </div>

        <label className="trackerField">
          <span>Reminder frequency</span>
          <select
            value={reminderFrequency}
            onChange={(e) => setReminderFrequency(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="twice_daily">Twice daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
      </div>

      <div className="weightGraphCard">
        <div className="weightGraphTitle">Recent trend</div>

        {recent.length === 0 ? (
          <div className="weightEmpty">No weight entries yet.</div>
        ) : (
          <div className="weightGraph">
            {recent.map((point) => {
              const normalized = range === 0 ? 55 : 20 + ((point.weight - minWeight) / range) * 80;

              return (
                <div className="weightBarWrap" key={point.date}>
                  <div className="weightPointValue">{point.weight}</div>
                  <div className="weightBarTrack">
                    <div
                      className="weightBarFill"
                      style={{ height: `${normalized}%` }}
                    />
                  </div>
                  <div className="weightBarDate">{formatWeightDate(point.date)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="trackerBottomRow">
        <button type="button" className="trackerGhostBtn" onClick={deleteTodayWeight}>
          Delete today
        </button>
      </div>
    </section>
  );
}

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snacks"];
const MEAL_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

// handle search requests better
async function searchFood(query, signal) {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`http://localhost:8000/usda/search?query=${encodeURIComponent(query.trim())}`, { signal });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") return null;
    return [];
  }
}

async function logMealWithFood(mealType, food, servingMultiplier, targetDate) {
  const email = localStorage.getItem("currentUserEmail");
  const mult = Number(servingMultiplier) || 1;

  const calories = food.macros?.calories ?? food.calories ?? 0;
  const protein = food.macros?.protein ?? food.protein ?? 0;
  const carbs = food.macros?.carbs ?? food.carbohydrates ?? 0;
  const fats = food.macros?.fats ?? food.fat ?? 0;
  const fiber = food.extras?.fiber ?? food.fiber ?? 0;
  const sodium = food.extras?.sodium ?? food.sodium ?? 0;

  const response = await fetch("http://localhost:8000/meals/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_email: email,
      meal_type: mealType,
      food_name: food.description,
      calories: Number(calories) * mult,
      protein: Number(protein) * mult,
      carbs: Number(carbs) * mult,
      fats: Number(fats) * mult,
      fiber: Number(fiber) * mult,
      sodium: Number(sodium) * mult,
      created_at: `${targetDate} 12:00:00`,
    }),
  });

  return response.json();
}

async function clearBackendMeals(targetDate) {
  const email = localStorage.getItem("currentUserEmail");
  await fetch(`http://localhost:8000/meals/reset?user_email=${email}&target_date=${targetDate}`, {
    method: "DELETE",
  });
}

function getSectionForEmptySuggestion(meals) {
  if (!meals.breakfast || meals.breakfast.length === 0) return "breakfast";
  if (!meals.lunch || meals.lunch.length === 0) return "lunch";
  if (!meals.dinner || meals.dinner.length === 0) return "dinner";
  return null;
}

const SERVING_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 2.5, 3];

function scaledNutrient(value, servingMult) {
  const mult = Number(servingMult) || 1;
  return Math.round((Number(value) || 0) * mult);
}

export default function Log() {
  const email = localStorage.getItem("currentUserEmail");
  const [refreshKey, setRefreshKey] = useState(0);

  const [currentDate, setCurrentDate] = useState(new Date());

  const formattedDate = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [currentDate]);

  const [meals, setMeals] = useState({
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  });

  const [waterGoalOz, setWaterGoalOz] = useState(64);
  const [cupOz, setCupOz] = useState(8);
  const [bottleOz, setBottleOz] = useState(24);
  const [waterOz, setWaterOz] = useState(0);
  const [waterHistory, setWaterHistory] = useState([]);

  const [activeTrackerTab, setActiveTrackerTab] = useState("water");
  const [weightEntries, setWeightEntries] = useState([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState("daily");
  const [lastReminderAt, setLastReminderAt] = useState(0);

  useEffect(() => {
    if (!email || !formattedDate) return;
    const saved = loadWaterForDay(email, formattedDate);
    setWaterGoalOz(saved.goalOz);
    setCupOz(saved.cupOz);
    setBottleOz(saved.bottleOz);
    setWaterOz(saved.totalOz);
    setWaterHistory(saved.history);
  }, [email, formattedDate]);

  useEffect(() => {
    if (!email || !formattedDate) return;
    saveWaterForDay(email, formattedDate, {
      goalOz: waterGoalOz,
      cupOz,
      bottleOz,
      totalOz: waterOz,
      history: waterHistory,
    });
  }, [email, formattedDate, waterGoalOz, cupOz, bottleOz, waterOz, waterHistory]);

  useEffect(() => {
    if (!email) return;
    setWeightEntries(loadWeightEntries(email));

    const trackerSettings = loadTrackerSettings(email);
    setReminderEnabled(trackerSettings.reminderEnabled);
    setReminderFrequency(trackerSettings.reminderFrequency);
    setLastReminderAt(trackerSettings.lastReminderAt);
  }, [email]);

  useEffect(() => {
    if (!email) return;
    saveWeightEntries(email, weightEntries);
  }, [email, weightEntries]);

  useEffect(() => {
    if (!email) return;
    saveTrackerSettings(email, {
      reminderEnabled,
      reminderFrequency,
      lastReminderAt,
    });
  }, [email, reminderEnabled, reminderFrequency, lastReminderAt]);

  useEffect(() => {
    if (!reminderEnabled) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const checkReminder = () => {
      const now = Date.now();
      const neededGap = frequencyToMs(reminderFrequency);

      if (!lastReminderAt || now - lastReminderAt >= neededGap) {
        new Notification("ChompSmart reminder", {
          body: "Time to log your weight for today 💙",
        });
        setLastReminderAt(now);
      }
    };

    checkReminder();
    const interval = window.setInterval(checkReminder, 60 * 1000);

    return () => window.clearInterval(interval);
  }, [reminderEnabled, reminderFrequency, lastReminderAt]);

  function addWater(amount, type) {
    const oz = Math.max(0, Number(amount) || 0);
    if (!oz) return;
    setWaterOz((prev) => prev + oz);
    setWaterHistory((prev) => [...prev, { oz, type, ts: Date.now() }]);
  }

  function undoWater() {
    setWaterHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setWaterOz((current) => Math.max(0, current - (Number(last.oz) || 0)));
      return prev.slice(0, -1);
    });
  }

  function resetWater() {
    if (!window.confirm("Reset today’s water tracker?")) return;
    setWaterOz(0);
    setWaterHistory([]);
  }

  useEffect(() => {
    if (!email || !formattedDate) return;

    fetch(`http://localhost:8000/meals/daily/${encodeURIComponent(email)}?target_date=${formattedDate}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;

        if (Array.isArray(data)) {
          const newMeals = { breakfast: [], lunch: [], dinner: [], snacks: [] };
          data.forEach((item) => {
            const type = item.meal_type ? item.meal_type.toLowerCase() : "snacks";
            if (newMeals[type]) newMeals[type].push(item);
          });
          setMeals(newMeals);
        } else {
          setMeals({
            breakfast: data.breakfast || [],
            lunch: data.lunch || [],
            dinner: data.dinner || [],
            snacks: data.snacks || [],
          });
        }
      })
      .catch((err) => console.error("Failed to load meals:", err));
  }, [email, refreshKey, formattedDate]);

  function goToPrevDay() {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  }

  function goToNextDay() {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  const isToday = formattedDate === new Date().toLocaleDateString("en-CA");

  const [expandedSection, setExpandedSection] = useState(null);
  const [inputValues, setInputValues] = useState({
    breakfast: "",
    lunch: "",
    dinner: "",
    snacks: "",
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedForModal, setSelectedForModal] = useState(null);
  const [servingMultiplier, setServingMultiplier] = useState(1);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

  function stopCamera() {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    } catch {}
    setCameraStream(null);
    setIsCameraOpen(false);
  }

  async function openCamera() {
    setCameraError("");
    setIsCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;
      setCameraStream(stream);
    } catch (e) {
      console.error(e);
      setCameraError("Camera not available. Use Upload instead.");
      setIsCameraOpen(false);
    }
  }

  useEffect(() => {
    if (!isCameraOpen || !cameraStream) return;

    const video = videoRef.current;
    if (!video) return;

    video.srcObject = cameraStream;

    const play = async () => {
      try {
        await video.play();
      } catch (e) {
        console.error("video.play() failed:", e);
      }
    };

    video.onloadedmetadata = play;
    play();

    return () => {
      video.onloadedmetadata = null;
    };
  }, [isCameraOpen, cameraStream]);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;

    if (!video.videoWidth || !video.videoHeight) {
      setCameraError("Camera is still loading — wait a second and try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setPreviewImage(canvas.toDataURL("image/jpeg", 0.9));
    stopCamera();
  }

  function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPreviewImage(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const suggestionSection = getSectionForEmptySuggestion(meals);

const searchCounterRef = useRef(0);
const inflightControllerRef = useRef(null);

useEffect(() => {
  const rawInput = expandedSection ? (inputValues[expandedSection] || "") : "";

  if (!rawInput.trim()) {
    setSearchResults([]);
    setSearchLoading(false);
    return;
  }

  setSearchLoading(true);
  const myCount = ++searchCounterRef.current;

  const timeoutId = setTimeout(() => {
    if (inflightControllerRef.current) {
      inflightControllerRef.current.abort();
    }
    const controller = new AbortController();
    inflightControllerRef.current = controller;

    searchFood(rawInput, controller.signal)
      .then((list) => {
        if (list === null || searchCounterRef.current !== myCount) return;
        setSearchResults(list);
        setSearchLoading(false);
      })
      .catch(() => {
        if (searchCounterRef.current !== myCount) return;
        setSearchResults([]);
        setSearchLoading(false);
      });
  }, 300);

  return () => {
    clearTimeout(timeoutId);
  };
}, [expandedSection, inputValues[expandedSection]]);

  function toggleExpand(mealKey) {
    setExpandedSection((prev) => (prev === mealKey ? null : mealKey));
    if (expandedSection === mealKey) setSearchResults([]);
  }

  function setInput(mealKey, value) {
    setInputValues((prev) => ({ ...prev, [mealKey]: value }));
  }

  function openAddModal(food, mealKey) {
    setSelectedForModal({ food, mealKey });
    setServingMultiplier(1);
    setSearchResults([]);
    setInput(mealKey, "");
  }

  async function confirmAddFromModal() {
    if (!selectedForModal) return;
    const { food, mealKey } = selectedForModal;

    await logMealWithFood(mealKey, food, servingMultiplier, formattedDate);

    setSelectedForModal(null);
    setExpandedSection(null);
    setRefreshKey((k) => k + 1);
  }

  async function removeItem(mealKey, index) {
    const itemToRemove = meals[mealKey][index];

    if (!itemToRemove || !itemToRemove.id) {
      setRefreshKey((k) => k + 1);
      return;
    }

    try {
      await fetch(`http://localhost:8000/meals/${itemToRemove.id}`, {
        method: "DELETE",
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  async function handleClearAll() {
    if (!window.confirm(`Are you sure you want to clear your meal log for ${currentDate.toLocaleDateString()}?`)) {
      return;
    }

    await clearBackendMeals(formattedDate);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="logPage">
      <div className="logContent">
        <div className="logDateBar">
          <button onClick={goToPrevDay} className="logDateBtn" type="button">
            ← Prev
          </button>

          <h2 className="logDateTitle">
            {isToday
              ? "Today"
              : currentDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
          </h2>

          <div className="logDateActions">
            {!isToday && (
              <button onClick={goToToday} className="logTodayBtn" type="button">
                Today
              </button>
            )}
            <button onClick={goToNextDay} className="logDateBtn" type="button">
              Next →
            </button>
          </div>
        </div>

        <div className="logWidgetPlaceholder">
          <TopDashboard
            userEmail={email}
            refreshKey={refreshKey}
            formattedDate={formattedDate}
            waterOz={waterOz}
            waterGoalOz={waterGoalOz}
          />
        </div>

        <TrackerTabs activeTab={activeTrackerTab} setActiveTab={setActiveTrackerTab}>
          {activeTrackerTab === "water" ? (
            <WaterTrackerCompact
              waterGoalOz={waterGoalOz}
              setWaterGoalOz={setWaterGoalOz}
              cupOz={cupOz}
              setCupOz={setCupOz}
              bottleOz={bottleOz}
              setBottleOz={setBottleOz}
              waterOz={waterOz}
              addWater={addWater}
              undoWater={undoWater}
              resetWater={resetWater}
            />
          ) : (
            <WeightTracker
              formattedDate={formattedDate}
              weightEntries={weightEntries}
              setWeightEntries={setWeightEntries}
              reminderEnabled={reminderEnabled}
              setReminderEnabled={setReminderEnabled}
              reminderFrequency={reminderFrequency}
              setReminderFrequency={setReminderFrequency}
            />
          )}
        </TrackerTabs>

        <div className="logResetRow">
          <button onClick={handleClearAll} className="logResetBtn" type="button">
            Reset Log
          </button>
        </div>

        <div className="logCard">
          {MEAL_ORDER.map((mealKey) => {
            const label = MEAL_LABELS[mealKey];
            const items = meals[mealKey] || [];
            const isExpanded = expandedSection === mealKey;
            const showSuggestion = suggestionSection === mealKey && isToday;
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") toggleExpand(mealKey);
                    }}
                  >
                    Log your {mealLabelLower} here
                  </span>
                </div>

                {isExpanded && (
                  <>
                    <div className="logSearchWrap">
                      <input
                        type="text"
                        className="logInput"
                        placeholder="Search food."
                        value={inputValues[mealKey] || ""}
                        onChange={(e) => setInput(mealKey, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && searchResults.length > 0) {
                            e.preventDefault();
                            openAddModal(searchResults[0], mealKey);
                          }
                        }}
                        autoFocus
                      />

                      {searchLoading && <div className="logSearchLoading">Searching.</div>}

                      {!searchLoading && searchResults.length > 0 && (
                        <ul className="logSearchDropdown">
                          {searchResults.map((food, i) => (
                            <li
                              key={`${food.description}-${i}`}
                              className="logSearchDropdownItem"
                              onClick={() => openAddModal(food, mealKey)}
                            >
                              {food.description}
                              <span className="logSearchDropdownCals">
                                {Math.round(Number(food.macros?.calories ?? food.calories ?? 0))} cal
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: "none" }}
                      onChange={onPickFile}
                    />

                    <div className="logInputRow">
                      <button type="button" className="logIconBtn" onClick={openCamera} title="Open Camera">
                        📷
                      </button>
                      <button
                        type="button"
                        className="logIconBtn"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload Photo"
                      >
                        ⬆️
                      </button>
                    </div>

                    {cameraError ? <div className="logError">{cameraError}</div> : null}

                    {previewImage ? (
                      <div className="logPreviewRow">
                        <img src={previewImage} className="logPreviewThumb" alt="preview" />
                        <button
                          type="button"
                          className="logPreviewClear"
                          onClick={() => setPreviewImage(null)}
                        >
                          Remove Photo
                        </button>
                      </div>
                    ) : null}

                    {isCameraOpen ? (
                      <div className="logCameraOverlay" role="dialog" aria-modal="true">
                        <div className="logCameraCard">
                          <video ref={videoRef} className="logCameraVideo" playsInline muted />
                          <div className="logCameraActions">
                            <button type="button" className="logModalCancel" onClick={stopCamera}>
                              Cancel
                            </button>
                            <button type="button" className="logModalAdd" onClick={capturePhoto}>
                              Capture
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}

                {items.length > 0 ? (
                  <ul className="logItemList">
                    {items.map((item, index) => (
                      <li key={item.id ?? `${item.food_name}-${index}`} className="logItem">
                        <div className="logItemName">
                          {item.food_name || item.name || "Logged food"}
                          {typeof item.calories !== "undefined" && (
                            <span className="logItemMeta"> · {Math.round(Number(item.calories) || 0)} cal</span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="logItemRemove"
                          onClick={() => removeItem(mealKey, index)}
                          aria-label={`Remove ${item.food_name || "item"}`}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="logEmptyState">
                    {showSuggestion ? (
                      <>
                        <strong>Nothing logged yet.</strong> Start with your first meal of the day here.
                      </>
                    ) : (
                      <>No items logged yet.</>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {selectedForModal && (
          <div className="logModalOverlay" role="dialog" aria-modal="true">
            <div className="logModal">
              <h3 className="logModalTitle">{selectedForModal.food.description}</h3>

              <div className="logModalNutrients">
                <div className="logModalNutrientRow">
                  <span>Calories</span>
                  <span>{scaledNutrient(selectedForModal.food.calories ?? selectedForModal.food.macros?.calories, servingMultiplier)}</span>
                </div>
                <div className="logModalNutrientRow">
                  <span>Protein</span>
                  <span>{scaledNutrient(selectedForModal.food.protein ?? selectedForModal.food.macros?.protein, servingMultiplier)}g</span>
                </div>
                <div className="logModalNutrientRow">
                  <span>Carbs</span>
                  <span>{scaledNutrient(selectedForModal.food.carbohydrates ?? selectedForModal.food.macros?.carbs, servingMultiplier)}g</span>
                </div>
                <div className="logModalNutrientRow">
                  <span>Fats</span>
                  <span>{scaledNutrient(selectedForModal.food.fat ?? selectedForModal.food.macros?.fats, servingMultiplier)}g</span>
                </div>
                <div className="logModalNutrientRow">
                  <span>Fiber</span>
                  <span>{scaledNutrient(selectedForModal.food.fiber ?? selectedForModal.food.extras?.fiber, servingMultiplier)}g</span>
                </div>
                <div className="logModalNutrientRow">
                  <span>Sodium</span>
                  <span>{scaledNutrient(selectedForModal.food.sodium ?? selectedForModal.food.extras?.sodium, servingMultiplier)}mg</span>
                </div>
              </div>

              <div className="logModalServing">
                <label className="logModalServingLabel">Serving amount</label>
                <select
                  className="logModalServingSelect"
                  value={servingMultiplier}
                  onChange={(e) => setServingMultiplier(Number(e.target.value))}
                >
                  {SERVING_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}x
                    </option>
                  ))}
                </select>
              </div>

              <div className="logModalActions">
                <button type="button" className="logModalCancel" onClick={() => setSelectedForModal(null)}>
                  Cancel
                </button>
                <button type="button" className="logModalAdd" onClick={confirmAddFromModal}>
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}