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
    carbs: 0,
    fats: 0,
    fiber: 0,
    fluidsL: 0,
    streakDays: 0,
    weeklyAvgCalories: 0,
  });

  useEffect(() => {
    if (!userEmail) return;
    fetch(`http://localhost:8000/profile/${encodeURIComponent(userEmail)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data != null) setProfile(data);
      })
      .catch((err) => console.error("Profile fetch failed:", err));
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;

    fetch(`http://localhost:8000/meals/today?user_email=${encodeURIComponent(userEmail)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((meals) => {
        const list = Array.isArray(meals) ? meals : [];
        const totalCals = list.reduce((acc, item) => acc + (Number(item.calories) || 0), 0);
        const totalProt = list.reduce((acc, item) => acc + (Number(item.protein) || 0), 0);
        const totalCarbs = list.reduce((acc, item) => acc + (Number(item.carbs) || 0), 0);
        const totalFats = list.reduce((acc, item) => acc + (Number(item.fats) || 0), 0);
        const totalFluids = list.reduce((acc, item) => acc + (Number(item.fluids) || 0), 0);

        setMetrics((prev) => ({
          ...prev,
          calories: totalCals,
          protein: totalProt,
          carbs: totalCarbs,
          fats: totalFats,
          fluidsL: totalFluids,
        }));
      })
      .catch((err) => console.error("Metrics fetch failed:", err));
  }, [userEmail, refreshKey]);

  // goals from profile (TDEE/macros when set), with fallbacks
  const goals = {
    calories: Number(profile?.calorie_goal ?? 2100),
    protein: Number(profile?.protein_g ?? 95),
    carbs: Number(profile?.carbs_g ?? 275),
    fats: Number(profile?.fats_g ?? 90),
    fiber: Number(profile?.fiber_g ?? 25),
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
            <div className="tdGoalLine">Carbs: {Math.round(metrics.carbs || 0)}/{goals.carbs}g</div>
            <div className="tdGoalLine">Protein: {Math.round(metrics.protein || 0)}/{goals.protein}g</div>
            <div className="tdGoalLine">Fats: {Math.round(metrics.fats || 0)}/{goals.fats}g</div>
            <div className="tdGoalLine">Fiber: {Math.round(metrics.fiber || 0)}/{goals.fiber}g</div>
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

async function searchFood(query) {
  if (!query.trim()) return [];
  const res = await fetch(
    `http://localhost:8000/usda/search?query=${encodeURIComponent(query.trim())}`
  );
  if (!res.ok) return [];
  return res.json();
}

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

async function logMealWithFood(mealType, food, servingMultiplier) {
  const email = localStorage.getItem("currentUserEmail");
  const mult = Number(servingMultiplier) || 1;
  const response = await fetch("http://localhost:8000/meals/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_email: email,
      meal_type: mealType,
      food_name: food.description,
      calories: Number(food.calories || 0) * mult,
      protein: Number(food.protein || 0) * mult,
      carbs: Number(food.carbohydrates || 0) * mult,
      fats: Number(food.fat || 0) * mult,
    }),
  });
  return response.json();
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

const SERVING_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 2.5, 3];

function scaledNutrient(value, servingMult) {
  const mult = Number(servingMult) || 1;
  return Math.round((Number(value) || 0) * mult);
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
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedForModal, setSelectedForModal] = useState(null);
  const [servingMultiplier, setServingMultiplier] = useState(1);

  // ---------------- CAMERA / UPLOAD ----------------
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
  if (!isCameraOpen) return;
  if (!cameraStream) return;

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
    setExpandedSection(expandedSection === mealKey ? null : mealKey);
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
    const result = await logMealWithFood(mealKey, food, servingMultiplier);
    if (!result || !result.ok || !result.id) return;

    // (yavna) connect meal id so that it can be deleted from database
    const newItem = { name: food.description, id: result.id };
    setMeals((prev) => ({
      ...prev,
      [mealKey]: [...prev[mealKey], newItem],
    }));
    setSelectedForModal(null);
    setExpandedSection(null);
    setRefreshKey((k) => k + 1);
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
        method: "DELETE",
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
      {selectedForModal && (
        <div className="logModalOverlay" onClick={() => setSelectedForModal(null)}>
          <div className="logModal" onClick={(e) => e.stopPropagation()}>
            <h3 className="logModalTitle">{selectedForModal.food.description}</h3>
            <div className="logModalNutrients">
              <div className="logModalNutrientRow">
                <span>Calories</span>
                <span>{scaledNutrient(selectedForModal.food.calories, servingMultiplier)}</span>
              </div>
              <div className="logModalNutrientRow">
                <span>Protein</span>
                <span>{scaledNutrient(selectedForModal.food.protein, servingMultiplier)}g</span>
              </div>
              <div className="logModalNutrientRow">
                <span>Carbs</span>
                <span>{scaledNutrient(selectedForModal.food.carbohydrates, servingMultiplier)}g</span>
              </div>
              <div className="logModalNutrientRow">
                <span>Fat</span>
                <span>{scaledNutrient(selectedForModal.food.fat, servingMultiplier)}g</span>
              </div>
            </div>
            <div className="logModalServing">
              <label className="logModalServingLabel">Serving size</label>
              <select
                className="logModalServingSelect"
                value={servingMultiplier}
                onChange={(e) => setServingMultiplier(Number(e.target.value))}
              >
                {SERVING_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 1 ? "1 (default)" : opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="logModalActions">
              <button type="button" className="logModalCancel" onClick={() => setSelectedForModal(null)}>
                Cancel
              </button>
              <button type="button" className="logModalAdd" onClick={confirmAddFromModal}>
                Add to {MEAL_LABELS[selectedForModal.mealKey]}
              </button>
            </div>
          </div>
        </div>
      )}
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
                  <>
                    <div className="logSearchWrap">
                      <input
                        type="text"
                        className="logInput"
                        placeholder="Search food..."
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
                      {searchLoading && <div className="logSearchLoading">Searching...</div>}
                      {!searchLoading && searchResults.length > 0 && (
                        <ul className="logSearchDropdown">
                          {searchResults.map((food, i) => (
                            <li
                              key={i}
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
                        <button type="button" className="logPreviewClear" onClick={() => setPreviewImage(null)}>
                          Remove Photo
                        </button>
                      </div>
                    ) : null}

                    {isCameraOpen ? (
                      <div className="logCameraOverlay" role="dialog" aria-modal="true">
                        <div className="logCameraCard">
                          <video ref={videoRef} className="logCameraVideo" playsInline muted autoPlay/>
                          <div className="logCameraActions">
                            <button type="button" className="logOkBtn" onClick={capturePhoto}>
                              Capture
                            </button>
                            <button type="button" className="logOkBtn" onClick={stopCamera}>
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </>
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

