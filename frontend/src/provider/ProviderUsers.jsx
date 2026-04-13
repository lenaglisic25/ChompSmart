import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../components/api";
import "./ProviderUsers.css";

const BARRIER_OPTIONS = [
  "Food access",
  "Missed pickup",
  "Transportation",
  "Cost",
  "Meal planning",
  "Label reading",
  "Carb counting confusion",
  "Low motivation",
  "Time constraints",
  "Low health literacy",
  "Medication confusion",
  "Technology access",
  "Language barrier",
  "Social support",
];

function calculateAge(dobString) {
  if (!dobString || dobString.trim() === "") return "-";
  let birthDate;
  if (dobString.includes("-")) {
    const parts = dobString.split("-");
    birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  } else if (dobString.includes("/")) {
    const parts = dobString.split("/");
    if (parts.length === 3) {
      birthDate = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    }
  } else {
    birthDate = new Date(dobString);
  }
  if (!birthDate || isNaN(birthDate.getTime())) return "-";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : "-";
}

function formatDateDisplay(dateStr) {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[1]}/${parts[2]}/${parts[0]}`;
}

function InfoChip({ children }) {
  return <span className="providerUsersChip">{children}</span>;
}

function StatCard({ label, value, isEditable, onChange, type = "text" }) {
  return (
    <div className="providerUsersStatCard">
      {isEditable ? (
        <input
          type={type}
          className="providerUsersStatInput"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="providerUsersStatValue">{value}</div>
      )}
      <div className="providerUsersStatLabel">{label}</div>
    </div>
  );
}

export default function ProviderUsers() {
  const navigate = useNavigate();
  const providerEmail = localStorage.getItem("currentProviderEmail");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [customBarrier, setCustomBarrier] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [appointmentDraft, setAppointmentDraft] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    if (!providerEmail) return;
    apiFetch("/providers/patients")
      .then((res) => res.json())
      .then((data) => {
        const mapped = data.map((u) => ({
          id: u.email,
          name: u.name || u.email,
          age: calculateAge(u.profile?.birthday_text),
          conditions: u.profile?.health_conditions || [],
          risk: "Moderate",
          nextAppointment: u.profile?.next_appointment || "",
          adherence: u.adherence?.daysLoggedPercent ? `${u.adherence.daysLoggedPercent}%` : "0%",
          engagement: "Normal",
          barriers: u.profile?.barriers || [],
          goal: u.profile?.weight_goal || "None",
          notes: u.profile?.provider_notes || "",
          email: u.email
        }));
        setUsers(mapped);
        if (mapped.length > 0 && !selectedId) setSelectedId(mapped[0].id);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [providerEmail]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(q) ||
        user.conditions.join(" ").toLowerCase().includes(q)
    );
  }, [search, users]);

  const selectedUser = users.find((user) => user.id === selectedId) || null;

  useEffect(() => {
    if (selectedUser) {
      setNoteDraft(selectedUser.notes || "");
      setAppointmentDraft(selectedUser.nextAppointment || "");
      setNoteSaved(false);
    }
  }, [selectedUser]);

  function updateSelectedUser(updater) {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === selectedId ? { ...user, ...updater(user) } : user
      )
    );
  }

  function toggleBarrier(barrier) {
    if (!selectedUser) return;
    updateSelectedUser((user) => {
      const exists = user.barriers.includes(barrier);
      return {
        barriers: exists
          ? user.barriers.filter((item) => item !== barrier)
          : [...user.barriers, barrier],
      };
    });
  }

  function addCustomBarrier() {
    const value = customBarrier.trim();
    if (!value || !selectedUser) return;
    updateSelectedUser((user) => ({
      barriers: [...user.barriers, value],
    }));
    setCustomBarrier("");
  }

  function removeBarrier(barrier) {
    if (!selectedUser) return;
    updateSelectedUser((user) => ({
      barriers: user.barriers.filter((item) => item !== barrier),
    }));
  }

  async function saveNotes() {
    if (!selectedUser) return;
    const payload = {
      user_email: selectedUser.email,
      provider_notes: noteDraft,
      next_appointment: appointmentDraft,
      barriers: selectedUser.barriers
    };
    try {
      const res = await apiFetch("/profile/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        updateSelectedUser(() => ({
          notes: noteDraft,
          nextAppointment: appointmentDraft
        }));
        setNoteSaved(true);
        window.setTimeout(() => setNoteSaved(false), 1800);
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="providerUsersPage">Loading...</div>;

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
          placeholder="Search patients..."
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
                className={`providerUserCard ${selectedUser?.id === user.id ? "active" : ""}`}
                onClick={() => setSelectedId(user.id)}
              >
                <div className="providerUserCardTop">
                  <div className="providerUserName">{user.name}</div>
                  <div className={`providerUserRisk ${user.risk.toLowerCase()}`}>
                    {user.risk}
                  </div>
                </div>
                <div className="providerUserConditions">
                  {user.conditions.slice(0, 2).join(" • ")}
                </div>
                <div className="providerUserMeta">
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
                <button type="button" onClick={() => navigate(`/provider/messages?email=${selectedUser.email}`)}>Message</button>
                <button type="button" onClick={() => navigate(`/provider/dashboard`)}>View Dashboard</button>
                <button type="button" onClick={saveNotes}>Save Changes</button>
              </div>
            </div>

            <div className="providerUsersStatsGrid">
              <StatCard label="Risk Level" value={selectedUser.risk} />
              <StatCard label="Adherence" value={selectedUser.adherence} />
              <StatCard label="Engagement" value={selectedUser.engagement} />
              <StatCard
                label="Next Appointment"
                value={appointmentDraft}
                isEditable
                type="date"
                onChange={setAppointmentDraft}
              />
            </div>

            <div className="providerUsersContentGrid">
              <section className="providerUsersPanel">
                <h3>Patient Snapshot</h3>
                <div className="providerUsersInfoList">
                  <div>
                    <strong>Current Goal:</strong> {selectedUser.goal}
                  </div>
                  <div>
                    <strong>Next Appointment:</strong> {formatDateDisplay(appointmentDraft) || "Not set"}
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
                <div className="providerUsersOptionGrid">
                  {BARRIER_OPTIONS.map((option) => {
                    const checked = selectedUser.barriers.includes(option);
                    return (
                      <label
                        key={option}
                        className={`providerUsersOption ${checked ? "selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBarrier(option)}
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="providerUsersCustomRow">
                  <input
                    type="text"
                    className="providerUsersCustomInput"
                    placeholder="Add custom concern..."
                    value={customBarrier}
                    onChange={(e) => setCustomBarrier(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomBarrier();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="providerUsersAddBtn"
                    onClick={addCustomBarrier}
                  >
                    Add
                  </button>
                </div>

                <div className="providerUsersChipList providerUsersSelectedBarriers">
                  {selectedUser.barriers.map((barrier) => (
                    <button
                      key={barrier}
                      type="button"
                      className="providerUsersChip removable"
                      onClick={() => removeBarrier(barrier)}
                    >
                      {barrier} ×
                    </button>
                  ))}
                </div>
              </section>

              <section className="providerUsersPanel providerUsersNotesPanel">
                <div className="providerUsersNotesHeader">
                  <h3>Provider Notes</h3>
                  <button
                    type="button"
                    className="providerUsersSaveBtn"
                    onClick={saveNotes}
                  >
                    Save Notes
                  </button>
                </div>

                <textarea
                  className="providerUsersNotesTextarea"
                  value={noteDraft}
                  onChange={(e) => {
                    setNoteDraft(e.target.value);
                    setNoteSaved(false);
                  }}
                  placeholder="Add provider notes here..."
                />

                {noteSaved ? (
                  <div className="providerUsersSavedText">Notes saved</div>
                ) : null}
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