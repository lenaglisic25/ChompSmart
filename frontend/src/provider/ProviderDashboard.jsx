import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../components/api";
import "./ProviderDashboard.css";
import ProviderAnalyticsDrawer from "./ProviderAnalyticsDrawer";
import { mockPanelAnalytics, mockPatient } from "./mockProviderData";

function parseHeight(heightText) {
  if (!heightText) return NaN;
  const s = heightText.trim().toLowerCase();
  
  const feetInchMatch = s.match(/(\d+)\s*(?:ft|feet|')?\s*(\d+)/);
  if (feetInchMatch) {
    const feet = parseInt(feetInchMatch[1]);
    const inches = parseInt(feetInchMatch[2]);
    return feet * 12 + inches;
  }
  
  const inchesMatch = s.match(/(\d+)\s*(?:in|inch|inches|"|\u2033)/);
  if (inchesMatch) {
    return parseInt(inchesMatch[1]);
  }
  return NaN;
}

function SummaryCard({ title, action, children, className = "" }) {
  return (
    <section className={`providerCard ${className}`}>
      <div className="providerCardHeader">
        <h3 className="providerCardTitle">{title}</h3>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="providerCardBody">{children}</div>
    </section>
  );
}

function SnapshotItem({ label, value }) {
  return (
    <div className="providerSnapshotItem">
      <div className="providerSnapshotLabel">{label}</div>
      <div className="providerSnapshotValue">{value}</div>
    </div>
  );
}

function ProgressRing({ value, label }) {
  const normalized = Math.max(0, Math.min(100, value));
  return (
    <div className="providerRingWrap">
      <div
        className="providerRing"
        style={{
          background: `conic-gradient(#2f69a8 ${normalized * 3.6}deg, #e5edf6 0deg)`,
        }}
      >
        <div className="providerRingInner">
          <div className="providerRingValue">{normalized}%</div>
        </div>
      </div>
      <div className="providerRingLabel">{label}</div>
    </div>
  );
}

function AlertBadge({ severity }) {
  return <span className={`providerAlertBadge ${severity}`}>{severity}</span>;
}

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [showNotePopup, setShowNotePopup] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [lastInteractionTimes, setLastInteractionTimes] = useState({});
  const [patientMeals, setPatientMeals] = useState({});
  const [patientVideos, setPatientVideos] = useState({});
  const [patientWeights, setPatientWeights] = useState({});
  const [_nutrientView, _setNutrientView] = useState("daily");

  const providerEmail = localStorage.getItem("currentProviderEmail") || localStorage.getItem("currentUserEmail");

  useEffect(() => {
    if (!providerEmail) return;
    apiFetch("/providers/patients")
      .then((res) => res.json())
      .then((data) => {
        setPatients(data);
        if (data.length > 0) {
          setSelectedEmail(data[0].email);
        }
      
        const timesMap = {};
        const mealsMap = {};
        const videosMap = {};
        const weightsMap = {};
        
        Promise.all(
          data.map((patient) =>
            Promise.all([
              apiFetch(`/messages/?patient_email=${encodeURIComponent(patient.email)}`)
                .then((res) => res.json())
                .then((messages) => {
                  if (Array.isArray(messages) && messages.length > 0) {
                    const lastMsg = messages[messages.length - 1];
                    timesMap[patient.email] = lastMsg.time;
                  }
                })
                .catch(() => {}),
              apiFetch(`/meals/log`)
                .then((res) => res.json())
                .then((meals) => {
                  if (Array.isArray(meals)) {
                    const patientSpecificMeals = meals.filter(m => m.user_email === patient.email);
                    mealsMap[patient.email] = patientSpecificMeals;
                  }
                })
                .catch(() => {}),
              apiFetch(`/tracker/weight/${encodeURIComponent(patient.email)}`)
                .then((res) => res.json())
                .then((weights) => {
                  if (Array.isArray(weights)) {
                    weightsMap[patient.email] = weights;
                  }
                })
                .catch(() => {}),
              apiFetch(`/badges/user/${encodeURIComponent(patient.email)}`)
                .then((res) => res.json())
                .then((badges) => {
                  if (Array.isArray(badges)) {
                    const vids = [];
                    const loveToLearn = badges.find(b => b.badge_name === "Love to Learn");
                    if (loveToLearn) {
                      vids.push({ id: "edu_1", title: "Health Education Resource", date: loveToLearn.earned_at });
                    }
                    const curiousChef = badges.find(b => b.badge_name === "Curious Chef");
                    if (curiousChef) {
                      vids.push({ id: "rec_1", title: "Recipe Walkthrough", date: curiousChef.earned_at });
                    }
                    videosMap[patient.email] = vids;
                  }
                })
                .catch(() => {})
            ])
          )
        ).then(() => {
          setLastInteractionTimes(timesMap);
          setPatientMeals(mealsMap);
          setPatientWeights(weightsMap);
          setPatientVideos(videosMap);
        });
      })
      .catch(() => {});
  }, [providerEmail]);

  const analytics = useMemo(() => {
    const barriers = {};
    let total = 0;
    patients.forEach((p) => {
      const b = p.profile?.barriers || [];
      b.forEach((barrier) => {
        barriers[barrier] = (barriers[barrier] || 0) + 1;
        total++;
      });
    });
    const topBarriers = Object.entries(barriers)
      .map(([label, count]) => ({ label, percent: Math.round((count / Math.max(total, 1)) * 100) }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 5);

    return {
      followUpQueue: patients.length,
      avgEngagementLogsPerWeek: 3.2,
      topBarriers: topBarriers.length > 0 ? topBarriers : mockPanelAnalytics.topBarriers,
      patientsNeedingFollowUp: patients.map((p) => p.name || p.email).slice(0, 5),
    };
  }, [patients]);

  const patient = useMemo(() => {
    const p = patients.find((x) => x.email === selectedEmail);
    if (!p) return mockPatient;

    const timeStr = lastInteractionTimes[selectedEmail];
    let lastSync = "Never";
    
    if (timeStr) {
      try {
        let lastMessageTime = new Date(timeStr);
        
        if (!/^\d{4}-/.test(timeStr) && /^\d{1,2}:\d{2}/.test(timeStr)) {
          const today = new Date();
          const timeParts = timeStr.match(/(\d{1,2}):(\d{2})/);
          if (timeParts) {
            lastMessageTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(timeParts[1]), parseInt(timeParts[2]));
          }
        }
        
        if (!isNaN(lastMessageTime.getTime())) {
          const now = new Date();
          const diffMs = now - lastMessageTime;
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          if (diffMins < 1) {
            lastSync = "Now";
          } else if (diffMins < 60) {
            lastSync = `${diffMins}m ago`;
          } else if (diffHours < 24) {
            lastSync = `${diffHours}h ago`;
          } else if (diffDays < 7) {
            lastSync = `${diffDays}d ago`;
          } else {
            lastSync = lastMessageTime.toLocaleDateString();
          }
        }
      } catch (error) {
        console.debug("Failed to parse last message time:", error);
        lastSync = timeStr;
      }
    }

    let bmi = mockPatient.bmi;
    if (p.profile?.weight_text && p.profile?.height_text) {
      const weightStr = String(p.profile.weight_text).toLowerCase().trim();
      const heightStr = String(p.profile.height_text).toLowerCase().trim();
      
      const weightMatch = weightStr.match(/(\d+\.?\d*)/);
      let weightLbs = weightMatch ? parseFloat(weightMatch[1]) : 0;
      
      let heightInches = parseHeight(heightStr);
      
      if (isNaN(heightInches)) {
        const heightMatch = heightStr.match(/(\d+)\s*['\u2032]?\s*(\d+)/);
        if (heightMatch) {
          const feet = parseInt(heightMatch[1]);
          const inches = parseInt(heightMatch[2]);
          heightInches = feet * 12 + inches;
        } else {
          const heightNumMatch = heightStr.match(/(\d+\.?\d*)/);
          if (heightNumMatch) {
            let heightNum = parseFloat(heightNumMatch[1]);
            if (heightNum > 200) {
              heightInches = heightNum / 2.54;
            } else if (heightNum > 12) {
              heightInches = heightNum;
            } else {
              heightInches = heightNum * 12;
            }
          }
        }
      }
      
      if (weightLbs > 0 && heightInches > 0) {
        const calculatedBmi = ((weightLbs / (heightInches * heightInches)) * 703);
        if (calculatedBmi > 10 && calculatedBmi < 60) {
          bmi = calculatedBmi.toFixed(1);
        }
      }
    }

    let weightChangePercent = 0;
    const weights = patientWeights[selectedEmail] || [];
    if (weights.length >= 2) {
      const sortedWeights = [...weights].sort((a, b) => new Date(a.date) - new Date(b.date));
      const firstWeight = sortedWeights[0].weight;
      const lastWeight = sortedWeights[sortedWeights.length - 1].weight;
      
      if (firstWeight > 0) {
        weightChangePercent = Number((((lastWeight - firstWeight) / firstWeight) * 100).toFixed(1));
      }
    }

    const profile = p.profile || {};
    const conditions = profile.health_conditions || [];
    const condLower = conditions.map(c => typeof c === 'string' ? c.toLowerCase() : '');

    const isDiabetes = condLower.some(c => c.includes("diabetes"));
    const isHypertension = condLower.some(c => c.includes("hypertension") || c.includes("blood pressure"));
    const isObesity = condLower.some(c => c.includes("obes") || c.includes("overweight"));

    const meals = patientMeals[selectedEmail] || [];
    const mealsByDate = {};
    
    meals.forEach(m => {
      if (!m.created_at) return;
      const dateStr = m.created_at.split(" ")[0].split("T")[0]; 
      if (!mealsByDate[dateStr]) mealsByDate[dateStr] = { calories: 0, sodium: 0, sugar: 0 };
      mealsByDate[dateStr].calories += Number(m.calories) || 0;
      mealsByDate[dateStr].sodium += Number(m.sodium) || 0;
      mealsByDate[dateStr].sugar += Number(m.sugar) || 0;
    });

    const calorieGoal = Number(profile.calorie_goal) || 2000;
    const sodiumLimit = Number(profile.sodium_fda_limit) || 2300;
    const sugarLimit = 50; 

    let calorieDaysUnder = 0;
    let sodiumDaysUnder = 0;
    let sugarDaysUnder = 0;

    Object.values(mealsByDate).forEach(dayStats => {
       if (dayStats.calories > 0 && dayStats.calories <= calorieGoal) calorieDaysUnder++;
       if (dayStats.sodium > 0 && dayStats.sodium <= sodiumLimit) sodiumDaysUnder++;
       if (dayStats.sugar > 0 && dayStats.sugar <= sugarLimit) sugarDaysUnder++;
    });

    const generatedAlerts = [];
    
    if (meals.length < 5 && meals.length > 0) {
      generatedAlerts.push({
        id: "low_logging",
        title: "Low meal logging activity",
        severity: "warning"
      });
    }

    if (profile.sodium_mg_actual > (profile.sodium_fda_limit || 2300)) {
      generatedAlerts.push({
        id: "sodium_high",
        title: `High sodium intake: ${profile.sodium_mg_actual}mg`,
        severity: "high"
      });
    }

    if (profile.next_appointment) {
      const appointmentDate = new Date(profile.next_appointment);
      const daysUntilAppointment = (appointmentDate - new Date()) / (1000 * 60 * 60 * 24);
      if (daysUntilAppointment > 0 && daysUntilAppointment <= 7) {
        generatedAlerts.push({
          id: "upcoming_appointment",
          title: `Appointment in ${Math.ceil(daysUntilAppointment)} days`,
          severity: "info"
        });
      }
    }

    return {
      ...mockPatient,
      id: p.email,
      name: p.name || p.email,
      conditions: p.profile?.health_conditions || [],
      weightKg: p.profile?.weight_text || mockPatient.weightKg,
      bmi: bmi,
      nextAppointment: p.profile?.next_appointment || "Not set",
      providerNotes: p.profile?.provider_notes || "",
      adherence: p.adherence || mockPatient.adherence,
      progress: {
        ...mockPatient.progress,
        weightChangePercent: weightChangePercent,
        calorieDaysUnder,
        sodiumDaysUnder,
        sugarDaysUnder,
        isDiabetes,
        isHypertension,
        isObesity
      },
      lastSync: lastSync,
      alerts: generatedAlerts.length > 0 ? generatedAlerts : mockPatient.alerts,
    };
  }, [patients, selectedEmail, lastInteractionTimes, patientMeals, patientWeights]);

  const handleMessageClick = () => {
    if (patient.id) {
      navigate(`/provider/messages?email=${patient.id}`);
    } else {
      navigate("/provider/messages");
    }
  };

  const handleViewProfile = () => {
    if (patient.id) {
      navigate(`/provider/users?email=${encodeURIComponent(patient.id)}`);
    }
  };

  async function handleAddNote() {
    if (!noteText.trim() || !patient.id) return;
    
    try {
      await apiFetch("/profile/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: patient.id,
          provider_notes: noteText
        })
      });
      setNoteText("");
      setShowNotePopup(false);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <>
      <div className="providerDashboard">
        <div style={{ padding: "20px 30px 0 30px" }}>
          <select
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "16px" }}
            value={selectedEmail}
            onChange={(e) => setSelectedEmail(e.target.value)}
          >
            {patients.length === 0 && <option value="">Loading patients...</option>}
            {patients.map((p) => (
              <option key={p.email} value={p.email}>
                {p.name || p.email}
              </option>
            ))}
          </select>
        </div>

        <section className="providerSnapshotBar">
          <div className="providerSnapshotMain">
            <div className="providerPatientName">{patient.name}</div>
            <div className="providerPatientConditions">
              {patient.conditions.join(" • ")}
            </div>
          </div>

          <div className="providerSnapshotGrid">
            <SnapshotItem label="Weight" value={`${patient.weightKg} lb`} />
            <SnapshotItem label="BMI" value={patient.bmi} />
            <SnapshotItem label="Last Sync" value={patient.lastSync} />
            <SnapshotItem label="Next Appointment" value={patient.nextAppointment} />
          </div>

          <div className="providerQuickActions">
            <button type="button" className="providerQuickBtn" onClick={handleMessageClick}>
              Message
            </button>
            <button type="button" className="providerQuickBtn" onClick={handleViewProfile}>
              View Profile
            </button>
            <button type="button" className="providerQuickBtn" onClick={() => setShowNotePopup(true)}>
              Add Note
            </button>
            <button
              type="button"
              className="providerQuickBtn analytics"
              onClick={() => setDrawerOpen(true)}
            >
              Panel Overview
            </button>
          </div>
        </section>

        <div className="providerTopGrid">
          <SummaryCard title="Adherence Summary">
            <div className="providerMetricBig">
              {patient.adherence.daysLoggedPercent}%
            </div>
            <div className="providerMetricCaption">Days with meal logs in last 30 days</div>

            <div className="providerMetricList">
              <div>Avg meals/day: {patient.adherence.avgMealsPerDay}</div>
              <div>Days with ≥2 meals: {patient.adherence.loggingConsistency}</div>
              <div>Biometrics adherence: {patient.adherence.biometricsAdherence}%</div>
            </div>
          </SummaryCard>

          <SummaryCard title="Progress">
            <div className="providerProgressArea">
              <ProgressRing
                value={patient.progress.goalCompletionPercent}
                label="Goal Completion"
              />
              <div className="providerMetricList">
                <div>Streak: {patient.progress.streakDays} days</div>
                <div>Weight trend: {patient.progress.weightChangePercent > 0 ? '+' : ''}{patient.progress.weightChangePercent}%</div>
                
                {patient.progress.isDiabetes && (
                  <div>Days under sugar limit: {patient.progress.sugarDaysUnder}</div>
                )}
                {patient.progress.isHypertension && (
                  <div>Sodium days under limit: {patient.progress.sodiumDaysUnder}</div>
                )}
                {patient.progress.isObesity && (
                  <div>Calorie goal achieved: {patient.progress.calorieDaysUnder} days</div>
                )}
                {(!patient.progress.isDiabetes && !patient.progress.isHypertension && !patient.progress.isObesity) && (
                  <div>Sodium days under limit: {patient.progress.sodiumDaysUnder}</div>
                )}
              </div>
            </div>
          </SummaryCard>

          <SummaryCard title="Alerts">
            <div className="providerAlertsCompact">
              {patient.alerts.length === 0 && (
                <div style={{ color: "#888", fontStyle: "italic", fontSize: "13px" }}>No active alerts.</div>
              )}
              {patient.alerts.map((alert) => (
                <div key={alert.id} className="providerCompactAlertRow">
                  <AlertBadge severity={alert.severity} />
                  <div className="providerCompactAlertText">{alert.title}</div>
                </div>
              ))}
            </div>
          </SummaryCard>
        </div>

        <div className="providerMiddleGrid">

          <SummaryCard title="Meal Photos (Quick Gallery)">
            <div className="providerPhotoGrid">
              {patient.mealPhotos.slice(0, 5).map((photo) => (
                <div key={photo.id} className="providerPhotoCard">
                  <img src={photo.url} alt="meal" className="providerPhotoImg" />
                  <span className="providerPhotoBadge">{photo.badge}</span>
                </div>
              ))}
            </div>
          </SummaryCard>
        </div>

        <div className="providerBottomGrid">
          <SummaryCard title="Provider Notes / Last Visit Summary">
            <div className="providerNotesBox">
              {patient.providerNotes ? (
                patient.providerNotes
              ) : (
                <div style={{ color: "#888", fontStyle: "italic", textAlign: "center", padding: "10px" }}>
                  No provider notes saved for this patient.
                </div>
              )}
            </div>

            <div className="providerResourceBox">
              <div className="providerResourceTitle">Engaged Resources</div>
              <div className="providerMetricList">
                <div>Total videos viewed: {(patientVideos[selectedEmail] || []).length}</div>
                <div>Avg watch time: {(patientVideos[selectedEmail] || []).length > 0 ? '15' : '0'} min</div>
              </div>

              <ul className="providerBulletList compact">
                {(patientVideos[selectedEmail] || []).slice(0, 5).map((video) => (
                  <li key={video.id || video.title}>{video.title || 'Video'}</li>
                ))}
                {(patientVideos[selectedEmail] || []).length === 0 && (
                  <li style={{ color: '#888', fontStyle: 'italic' }}>No videos watched yet</li>
                )}
              </ul>
            </div>
          </SummaryCard>
        </div>
      </div>

      <ProviderAnalyticsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        analytics={analytics}
      />

      {showNotePopup && (
        <div className="providerNotePopupOverlay" onClick={() => setShowNotePopup(false)}>
          <div className="providerNotePopup" onClick={(e) => e.stopPropagation()}>
            <div className="providerNotePopupHeader">
              <h3>Add Note to {patient.name}</h3>
              <button
                type="button"
                className="providerNotePopupClose"
                onClick={() => setShowNotePopup(false)}
              >
                ×
              </button>
            </div>
            <textarea
              className="providerNotePopupTextarea"
              placeholder="Write your note here..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <div className="providerNotePopupActions">
              <button
                type="button"
                className="providerNotePopupCancel"
                onClick={() => setShowNotePopup(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="providerNotePopupSave"
                onClick={handleAddNote}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}