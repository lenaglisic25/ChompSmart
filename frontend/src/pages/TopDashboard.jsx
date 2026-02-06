import React, { useEffect, useMemo, useState } from "react";
import "./TopDashboard.css";

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
function pct(current, goal) {
  if (!goal || goal <= 0) return 0;
  return clamp01(current / goal);
}

// Goal metrics: want to reach goal (protein, water)
function goalStatus(p) {
  if (p >= 1) return "good";
  if (p >= 0.75) return "warn";
  return "bad";
}

// Limit metrics: want to stay under (calories if treated as limit, sodium)
function limitStatus(p) {
  if (p <= 0.6) return "good";
  if (p <= 0.9) return "warn";
  return "bad";
}

function ProgressBar({ label, current, goal, unit = "", mode = "goal" }) {
  const p = pct(current, goal);
  const status = mode === "limit" ? limitStatus(p) : goalStatus(p);

  return (
    <div className="tdBarRow">
      <div className="tdBarTop">
        <div className="tdBarLabel">{label}</div>
        <div className="tdBarValue">
          {Math.round(current)}
          {unit} / {Math.round(goal)}
          {unit}
        </div>
      </div>

      <div className="tdBarTrack">
        <div className={`tdBarFill ${status}`} style={{ width: `${p * 100}%` }} />
      </div>
    </div>
  );
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

function buildAlerts(metrics, goals) {
  const alerts = [];

  const calP = metrics.calories / goals.calories;
  if (calP > 1.05) alerts.push({ level: "bad", text: "You are over your calorie goal today." });
  else if (calP > 0.9) alerts.push({ level: "warn", text: "You are close to your calorie goal." });

  const protP = metrics.protein / goals.protein;
  if (protP < 0.5) alerts.push({ level: "bad", text: "Protein is low today. Add a high-protein option." });
  else if (protP < 0.75) alerts.push({ level: "warn", text: "Try adding more protein to reach your goal." });

  const sodP = metrics.sodiumMg / goals.sodiumMg;
  if (sodP > 1) alerts.push({ level: "bad", text: "Sodium is over the daily limit." });
  else if (sodP > 0.9) alerts.push({ level: "warn", text: "Sodium is getting high. Choose lower-sodium foods." });

  const hydP = metrics.fluidsL / goals.fluidsL;
  if (hydP < 0.35) alerts.push({ level: "warn", text: "Hydration is behind. Drink a glass of water now." });

  const fibP = metrics.fiber / goals.fiber;
if (fibP < 0.5) alerts.push({ level: "warn", text: "Fiber is low today. Add fruit, beans, or whole grains." });

  return alerts.slice(0, 4);
}


function mapTotalsToMetrics(data) {
  // tolerate snake_case or camelCase
  return {
    calories: Number(data?.calories ?? 0),
    protein: Number(data?.protein ?? 0),
    sodiumMg: Number(data?.sodium_mg ?? data?.sodiumMg ?? 0),
    fluidsL: Number(data?.fluids_l ?? data?.fluidsL ?? 0),
    streakDays: Number(data?.streak_days ?? data?.streakDays ?? 0),
    weeklyAvgCalories: Number(data?.weekly_avg_calories ?? data?.weeklyAvgCalories ?? 0),
  };
}

function mapTotalsToGoals(data) {
  const g = data?.goals ?? {};
  return {
    calories: Number(g?.calories ?? 2100),
    protein: Number(g?.protein ?? 95),
    sodiumMg: Number(g?.sodium_mg ?? g?.sodiumMg ?? 2300),
    fluidsL: Number(g?.fluids_l ?? g?.fluidsL ?? 3.0),
  };
}

function TopDashboard({ user }) {
  // MOCK VALUES for now (front-end only)
  // (yavna) update to fetch from backend
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetch(`http://localhost:8000/profile/${user}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProfile(data))
      .catch((err) => console.error("Profile fetch failed:", err));
  }, [user]);

const goals = {
  calories: Number(profile?.calorie_goal ?? 2100),
  carbs: 275,
  fiber: 25,
  protein: 95,
  fats: 90,
  sodiumMg: 2300,
  fluidsL: 3.0,
};

 const metrics = {
  calories: 0,
  carbs: 0,
  fiber: 0,
  protein: 0,
  fats: 0,
  sodiumMg: 0,
  fluidsL: 0,
  streakDays: 0,
  weeklyAvgCalories: 0,
};


  const remainingCalories = Math.max(0, goals.calories - metrics.calories);


  const alerts = useMemo(() => {
    return [
      { level: "good", text: "You are doing great! Keep logging to keep up the progress!" },
      // add/remove placeholders as needed

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
              <div className="tdGoalLine">Carbs: {metrics.carbs}/{goals.carbs}g</div>
              <div className="tdGoalLine">Fiber: {metrics.fiber}/{goals.fiber}g</div>
              <div className="tdGoalLine">Protein: {metrics.protein}/{goals.protein}g</div>
              <div className="tdGoalLine">Fats: {metrics.fats}/{goals.fats}g</div>
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
            <div className="tdMiniCard tdAlertMascot">
              {/* simple mascot placeholder box (optional) */}
              <div className="tdMascotBubble">
                You are doing great! Keep logging to keep up the progress!
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
            <div className="tdCenterRingSub">
              Log one meal today to increase your streak
            </div>
          </div>

          <div className="tdMiniCard tdCenterRing">
            <Ring
              title={`${metrics.weeklyAvgCalories}/${goals.calories}`}
              subtitle="cals"
              current={metrics.weeklyAvgCalories}
              goal={goals.calories}
              mode="limit"
            />
            <div className="tdCenterRingSub">Weekly Avg Calories</div>
          </div>

          {/* Alerts area */}
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
