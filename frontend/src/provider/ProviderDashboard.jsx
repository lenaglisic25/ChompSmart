import { useMemo, useState } from "react";
import "./ProviderDashboard.css";
import ProviderAnalyticsDrawer from "./ProviderAnalyticsDrawer";
import { mockPanelAnalytics, mockPatient } from "./mockProviderData";

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

function NutrientRow({ label, value, unit, target, direction }) {
  const pct = Math.min((value / target) * 100, 100);
  return (
    <div className="providerNutrientRow">
      <div className="providerNutrientTop">
        <span>{label}</span>
        <span>
          {value} {unit} / {target} {unit}
        </span>
      </div>
      <div className="providerNutrientTrack">
        <div
          className={`providerNutrientFill ${direction}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AlertBadge({ severity }) {
  return <span className={`providerAlertBadge ${severity}`}>{severity}</span>;
}

export default function ProviderDashboard() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [nutrientView, setNutrientView] = useState("daily");

  const patient = mockPatient;
  const analytics = mockPanelAnalytics;

  const nutrientData = useMemo(() => {
    if (nutrientView === "weekly") return patient.nutrients.weeklyAvg;
    if (nutrientView === "monthly") return patient.nutrients.monthlyAvg;
    return patient.nutrients.daily;
  }, [nutrientView, patient]);

  return (
    <>
      <div className="providerDashboard">
        <section className="providerSnapshotBar">
          <div className="providerSnapshotMain">
            <div className="providerPatientName">{patient.name}</div>
            <div className="providerPatientConditions">
              {patient.conditions.join(" • ")}
            </div>
          </div>

          <div className="providerSnapshotGrid">
            <SnapshotItem label="Weight" value={`${patient.weightKg} kg`} />
            <SnapshotItem label="BMI" value={patient.bmi} />
            <SnapshotItem label="Last Sync" value={patient.lastSync} />
            <SnapshotItem label="Next Appointment" value={patient.nextAppointment} />
          </div>

          <div className="providerQuickActions">
            <button type="button" className="providerQuickBtn">
              Message
            </button>
            <button type="button" className="providerQuickBtn">
              Add Note
            </button>
            <button type="button" className="providerQuickBtn primary">
              Set Goal
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
                <div>Weight trend: {patient.progress.weightChangePercent}%</div>
                <div>Sodium days under limit: {patient.progress.sodiumDaysUnderLimit}</div>
              </div>
            </div>
          </SummaryCard>

          <SummaryCard title="Alerts">
            <div className="providerAlertsCompact">
              {patient.alerts.map((alert) => (
                <div key={alert.id} className="providerCompactAlertRow">
                  <AlertBadge severity={alert.severity} />
                  <div className="providerCompactAlertText">{alert.title}</div>
                </div>
              ))}
            </div>
          </SummaryCard>

          <SummaryCard title="Engagement & AI Summary">
            <div className="providerMetricList">
              <div>AI conversations (30d): {patient.engagement.aiConversations30d}</div>
              <div>Avg Qs/session: {patient.engagement.avgQuestionsPerSession}</div>
              <div>Peak times: {patient.engagement.peakTimes}</div>
              <div>Sentiment: {patient.engagement.sentiment}</div>
            </div>

            <div className="providerTagList">
              {patient.engagement.topTopics.map((topic) => (
                <span key={topic} className="providerTag">
                  {topic}
                </span>
              ))}
            </div>
          </SummaryCard>
        </div>

        <div className="providerMiddleGrid">
          <SummaryCard
            title="Nutrient Totals / Averages"
            action={
              <div className="providerSegmented">
                <button
                  className={nutrientView === "daily" ? "active" : ""}
                  onClick={() => setNutrientView("daily")}
                >
                  Daily
                </button>
                <button
                  className={nutrientView === "weekly" ? "active" : ""}
                  onClick={() => setNutrientView("weekly")}
                >
                  7-Day
                </button>
                <button
                  className={nutrientView === "monthly" ? "active" : ""}
                  onClick={() => setNutrientView("monthly")}
                >
                  30-Day
                </button>
              </div>
            }
            className="providerWideCard"
          >
            <div className="providerDataGrid">
              <div className="providerDataBox">
                <div className="providerDataLabel">Calories</div>
                <div className="providerDataValue">{nutrientData.calories}</div>
              </div>
              <div className="providerDataBox">
                <div className="providerDataLabel">Protein</div>
                <div className="providerDataValue">{nutrientData.protein} g</div>
              </div>
              <div className="providerDataBox">
                <div className="providerDataLabel">Carbs</div>
                <div className="providerDataValue">{nutrientData.carbs} g</div>
              </div>
              <div className="providerDataBox">
                <div className="providerDataLabel">Fat</div>
                <div className="providerDataValue">{nutrientData.fat} g</div>
              </div>
              <div className="providerDataBox">
                <div className="providerDataLabel">Sodium</div>
                <div className="providerDataValue">{nutrientData.sodium} mg</div>
              </div>
              <div className="providerDataBox">
                <div className="providerDataLabel">Sugar</div>
                <div className="providerDataValue">{nutrientData.sugar} g</div>
              </div>
              <div className="providerDataBox">
                <div className="providerDataLabel">Fiber</div>
                <div className="providerDataValue">{nutrientData.fiber} g</div>
              </div>
            </div>
          </SummaryCard>

          <SummaryCard title="Critical Nutrients & Warnings">
            <div className="providerNutrientList">
              {patient.criticalNutrients.map((item) => (
                <NutrientRow
                  key={item.key}
                  label={item.label}
                  value={item.value}
                  unit={item.unit}
                  target={item.target}
                  direction={item.direction}
                />
              ))}
            </div>

            <div className="providerInlineAlerts">
              {patient.mealAlerts.map((item) => (
                <div key={item} className="providerInlineAlert">
                  {item}
                </div>
              ))}
            </div>
          </SummaryCard>

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
          <SummaryCard title="AI-Flagged Patterns & Topics">
            <div className="providerPatternList">
              {patient.aiPatterns.map((item) => (
                <div key={item.id} className="providerPatternCard">
                  <div className="providerPatternTitle">{item.label}</div>
                  <div className="providerPatternEvidence">{item.evidence}</div>
                  <div className="providerPatternFollowup">
                    Recommended follow-up: {item.followUp}
                  </div>
                </div>
              ))}
            </div>
          </SummaryCard>

          <SummaryCard title="Recommended Follow-Up Topics">
            <div className="providerFollowUpList">
              {patient.followUpTopics.map((topic) => (
                <div key={topic} className="providerFollowUpItem">
                  <div className="providerFollowUpText">{topic}</div>
                  <div className="providerFollowUpActions">
                    <button type="button">Send Tip</button>
                    <button type="button">Queue Note</button>
                    <button type="button">Add to Plan</button>
                  </div>
                </div>
              ))}
            </div>
          </SummaryCard>

          <SummaryCard title="Provider Notes / Last Visit Summary">
            <div className="providerNotesBox">{patient.providerNotes}</div>

            <div className="providerResourceBox">
              <div className="providerResourceTitle">Engaged Resources</div>
              <div className="providerMetricList">
                <div>Total videos viewed: {patient.engagedResources.totalVideosViewed}</div>
                <div>Avg watch time: {patient.engagedResources.avgWatchTimeMin} min</div>
              </div>

              <ul className="providerBulletList compact">
                {patient.engagedResources.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
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
    </>
  );
}