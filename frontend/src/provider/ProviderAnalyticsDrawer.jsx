import "./ProviderDashboard.css";

function BarrierBar({ label, percent }) {
  return (
    <div className="providerBarrierRow">
      <div className="providerBarrierTop">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="providerBarrierTrack">
        <div className="providerBarrierFill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default function ProviderAnalyticsDrawer({ open, onClose, analytics }) {
  if (!open) return null;

  return (
    <div className="providerDrawerOverlay" onClick={onClose}>
      <aside className="providerDrawer" onClick={(e) => e.stopPropagation()}>
        <div className="providerDrawerHeader">
          <h2>Provider Analytics</h2>
          <button type="button" className="providerDrawerClose" onClick={onClose}>
            ×
          </button>
        </div>

        <section className="providerDrawerSection">
          <h3>Follow-Up Queue</h3>
          <div className="providerDrawerMetric">
            {analytics.followUpQueue} patients need follow-up
          </div>
        </section>

        <section className="providerDrawerSection">
          <h3>Engagement</h3>
          <div className="providerDrawerMetric">
            Avg engagement: {analytics.avgEngagementLogsPerWeek} logs/week per patient
          </div>
        </section>

        <section className="providerDrawerSection">
          <h3>Top Barriers / Concerns</h3>
          <div className="providerBarrierList">
            {analytics.topBarriers.map((item) => (
              <BarrierBar key={item.label} label={item.label} percent={item.percent} />
            ))}
          </div>
        </section>

        <section className="providerDrawerSection">
          <h3>Patients Needing Follow-Up</h3>
          <ul className="providerBulletList">
            {analytics.patientsNeedingFollowUp.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}