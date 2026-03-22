import { useMemo, useState } from "react";
import "./ProviderUsers.css";

const mockUsers = [
  {
    id: "u1",
    name: "Maria Gonzalez",
    age: 52,
    conditions: ["Hypertension", "Type 2 Diabetes"],
    risk: "High",
    lastSync: "2 hours ago",
    nextAppointment: "Mar 26, 2026",
    adherence: "72%",
    engagement: "Moderate",
    barriers: ["Food access", "Carb counting confusion"],
    goal: "Lower sodium intake",
    notes: "Needs follow-up on carb counting and weekend sodium intake.",
  },
  {
    id: "u2",
    name: "James Carter",
    age: 47,
    conditions: ["Hypertension"],
    risk: "Moderate",
    lastSync: "Yesterday",
    nextAppointment: "Mar 28, 2026",
    adherence: "64%",
    engagement: "Low",
    barriers: ["Missed pickup", "Transportation"],
    goal: "Improve logging consistency",
    notes: "Missed Food Pharmacy pickup. May need outreach support.",
  },
  {
    id: "u3",
    name: "Alicia Brown",
    age: 38,
    conditions: ["Prediabetes"],
    risk: "Low",
    lastSync: "Today",
    nextAppointment: "Apr 2, 2026",
    adherence: "81%",
    engagement: "High",
    barriers: ["Label reading"],
    goal: "Reduce added sugar",
    notes: "Frequently engages with educational content.",
  },
  {
    id: "u4",
    name: "Kevin Lopez",
    age: 59,
    conditions: ["Type 2 Diabetes", "High Cholesterol"],
    risk: "Moderate",
    lastSync: "3 days ago",
    nextAppointment: "Apr 4, 2026",
    adherence: "58%",
    engagement: "Moderate",
    barriers: ["Cost", "Meal planning"],
    goal: "Increase fiber intake",
    notes: "Would benefit from quick meal-prep suggestions.",
  },
];

function InfoChip({ children }) {
  return <span className="providerUsersChip">{children}</span>;
}

function StatCard({ label, value }) {
  return (
    <div className="providerUsersStatCard">
      <div className="providerUsersStatValue">{value}</div>
      <div className="providerUsersStatLabel">{label}</div>
    </div>
  );
}

export default function ProviderUsers() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(mockUsers[0].id);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mockUsers;

    return mockUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(q) ||
        user.risk.toLowerCase().includes(q) ||
        user.conditions.join(" ").toLowerCase().includes(q) ||
        user.barriers.join(" ").toLowerCase().includes(q)
    );
  }, [search]);

  const selectedUser =
    mockUsers.find((user) => user.id === selectedId) ||
    filteredUsers[0] ||
    null;

  return (
    <div className="providerUsersPage">
      <aside className="providerUsersSidebar">
        <div className="providerUsersSidebarTop">
          <h2 className="providerUsersTitle">Users</h2>
          <div className="providerUsersCount">{filteredUsers.length} patients</div>
        </div>

        <input
          type="text"
          className="providerUsersSearch"
          placeholder="Search patients, conditions, risk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="providerUsersList">
          {filteredUsers.length === 0 ? (
            <div className="providerUsersEmpty">No patients found.</div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                className={`providerUserCard ${
                  selectedUser?.id === user.id ? "active" : ""
                }`}
                onClick={() => setSelectedId(user.id)}
              >
                <div className="providerUserCardTop">
                  <div className="providerUserName">{user.name}</div>
                  <div className={`providerUserRisk ${user.risk.toLowerCase()}`}>
                    {user.risk}
                  </div>
                </div>

                <div className="providerUserConditions">
                  {user.conditions.join(" • ")}
                </div>

                <div className="providerUserMeta">
                  <span>Last sync: {user.lastSync}</span>
                  <span>Adherence: {user.adherence}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="providerUsersDetail">
        {selectedUser ? (
          <>
            <div className="providerUsersHeader">
              <div>
                <div className="providerUsersPatientName">{selectedUser.name}</div>
                <div className="providerUsersSub">
                  Age {selectedUser.age} • {selectedUser.conditions.join(" • ")}
                </div>
              </div>

              <div className="providerUsersHeaderActions">
                <button type="button">Message</button>
                <button type="button">View Dashboard</button>
                <button type="button">Add Note</button>
              </div>
            </div>

            <div className="providerUsersStatsGrid">
              <StatCard label="Risk Level" value={selectedUser.risk} />
              <StatCard label="Adherence" value={selectedUser.adherence} />
              <StatCard label="Engagement" value={selectedUser.engagement} />
              <StatCard label="Next Appointment" value={selectedUser.nextAppointment} />
            </div>

            <div className="providerUsersContentGrid">
              <section className="providerUsersPanel">
                <h3>Patient Snapshot</h3>
                <div className="providerUsersInfoList">
                  <div>
                    <strong>Last Sync:</strong> {selectedUser.lastSync}
                  </div>
                  <div>
                    <strong>Current Goal:</strong> {selectedUser.goal}
                  </div>
                  <div>
                    <strong>Next Appointment:</strong> {selectedUser.nextAppointment}
                  </div>
                </div>
              </section>

              <section className="providerUsersPanel">
                <h3>Conditions</h3>
                <div className="providerUsersChipList">
                  {selectedUser.conditions.map((condition) => (
                    <InfoChip key={condition}>{condition}</InfoChip>
                  ))}
                </div>
              </section>

              <section className="providerUsersPanel">
                <h3>Barriers / Concerns</h3>
                <div className="providerUsersChipList">
                  {selectedUser.barriers.map((barrier) => (
                    <InfoChip key={barrier}>{barrier}</InfoChip>
                  ))}
                </div>
              </section>

              <section className="providerUsersPanel providerUsersNotesPanel">
                <h3>Provider Notes</h3>
                <div className="providerUsersNotesBox">{selectedUser.notes}</div>
              </section>
            </div>
          </>
        ) : (
          <div className="providerUsersEmptyDetail">Select a patient to view details.</div>
        )}
      </section>
    </div>
  );
}