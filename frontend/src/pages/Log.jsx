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

function litersToOz(liters) {
  return Number(liters || 0) * 33.814;
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

function WaterTracker({
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
  const markers = Array.from({ length: 8 }, (_, i) => i);
  const filledCount = Math.round(progress * 8);
  const remainingOz = Math.max(0, waterGoalOz - waterOz);
  const cupsLeft = cupOz > 0 ? Math.ceil(remainingOz / cupOz) : 0;
  const bottlesLeft = bottleOz > 0 ? (remainingOz / bottleOz).toFixed(1) : "0";

  return (
    <section className="waterCard">
      <div className="waterHeader">
        <div>
          <h2 className="waterTitle">Water Tracker</h2>
          <p className="waterSubtitle">Tap your cup or bottle to add water to today’s goal.</p>
        </div>

        <button
          type="button"
          className="waterEditBtn"
          onClick={() => setIsEditing((v) => !v)}
        >
          {isEditing ? "Done" : "Edit"}
        </button>
      </div>

      <div className="waterTopRow">
        <div className="waterGoalBlock">
          <div className="waterBigNumber">
            {Math.round(waterOz)} <span>oz</span>
          </div>
          <div className="waterGoalText">Goal: {Math.round(waterGoalOz)} oz daily</div>
        </div>

        <div className="waterProgressBlock">
          <div className="waterProgressTrack">
            <div className="waterProgressFill" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
          </div>
          <div className="waterProgressLabel">
            {Math.round(waterOz)} / {Math.round(waterGoalOz)} oz
          </div>
        </div>
      </div>

      <div className="waterMarkers" aria-hidden="true">
        {markers.map((idx) => (
          <div key={idx} className={`waterMarker ${idx < filledCount ? "filled" : ""}`}>
            💧
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="waterEditPanel">
          <label className="waterEditField">
            <span>Daily goal (oz)</span>
            <input
              type="number"
              min="1"
              value={waterGoalOz}
              onChange={(e) => setWaterGoalOz(Math.max(1, Number(e.target.value) || 64))}
            />
          </label>

          <label className="waterEditField">
            <span>Default cup (oz)</span>
            <input
              type="number"
              min="1"
              value={cupOz}
              onChange={(e) => setCupOz(Math.max(1, Number(e.target.value) || 8))}
            />
          </label>

          <label className="waterEditField">
            <span>Default bottle (oz)</span>
            <input
              type="number"
              min="1"
              value={bottleOz}
              onChange={(e) => setBottleOz(Math.max(1, Number(e.target.value) || 24))}
            />
          </label>
        </div>
      )}

      <div className="waterActions">
        <button type="button" className="waterActionPrimary" onClick={() => addWater(cupOz, "cup")}>
          + Cup ({cupOz} oz)
        </button>

        <button type="button" className="waterActionPrimary" onClick={() => addWater(bottleOz, "bottle")}>
          + Bottle ({bottleOz} oz)
        </button>

        <button type="button" className="waterActionSecondary" onClick={undoWater}>
          Undo
        </button>

        <button type="button" className="waterActionSecondary" onClick={resetWater}>
          Reset
        </button>
      </div>

      <div className="waterHelperRow">
        <div className="waterHelperPill">
          {remainingOz > 0 ? `${cupsLeft} cup${cupsLeft === 1 ? "" : "s"} left` : "Goal reached"}
        </div>
        <div className="waterHelperPill">
          {remainingOz > 0 ? `${bottlesLeft} bottle${Number(bottlesLeft) === 1 ? "" : "s"} left` : "Nice job"}
        </div>
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

async function searchFood(query) {
  if (!query.trim()) return [];
  const res = await fetch(`http://localhost:8000/usda/search?query=${encodeURIComponent(query.trim())}`);
  if (!res.ok) return [];
  return res.json();
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

  useEffect(() => {
    const currentQuery = expandedSection ? (inputValues[expandedSection] || "").trim() : "";
    if (!currentQuery) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    searchFood(currentQuery)
      .then((list) => setSearchResults(list || []))
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, [expandedSection, inputValues]);

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

        <WaterTracker
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
                                {Math.round(Number(food.calories || 0))} cal
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
                  <span>{scaledNutrient(selectedForModal.food.calories, servingMultiplier)}</span>
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
                  <span>Fat</span>
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
                <label className="logModalServingLabel" htmlFor="serving-multiplier">
                  Serving size
                </label>
                <select
                  id="serving-multiplier"
                  className="logModalServingSelect"
                  value={servingMultiplier}
                  onChange={(e) => setServingMultiplier(Number(e.target.value))}
                >
                  {SERVING_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} serving{opt !== 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="logModalActions">
                <button
                  type="button"
                  className="logModalCancel"
                  onClick={() => setSelectedForModal(null)}
                >
                  Cancel
                </button>
                <button type="button" className="logModalAdd" onClick={confirmAddFromModal}>
                  Add Food
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}