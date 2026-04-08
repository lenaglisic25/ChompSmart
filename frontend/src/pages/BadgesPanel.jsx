import React, { useEffect, useMemo, useState } from "react";
import "./BadgesPanel.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

const BADGE_ICONS = {
  "First Week Milestone": "🌟",
  "Love to Learn": "📚",
  "Curious Chef": "👩‍🍳",
  "First Log of the Day": "🥄",
  "3-Day Consistency": "📅",
  "Building a Balanced Plate": "🥗",
  "Sodium Smart Swap": "🧂",
  "Fiber Boost": "🌾",
  "Hydration Hero": "💧",
};

const CATEGORY_LABELS = {
  engagement: "Engagement & Motivation",
  nutrition: "Nutrition Tracking Goals",
};

function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BadgesPanel({ userEmail }) {
  const [allBadges, setAllBadges] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popupBadges, setPopupBadges] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [error, setError] = useState("");

  const earnedMap = useMemo(() => {
    const map = new Map();
    earnedBadges.forEach((badge) => {
      map.set(badge.badge_name, badge);
    });
    return map;
  }, [earnedBadges]);

  useEffect(() => {
    if (!userEmail) return;
    loadBadges();
    checkNewBadges();

    const interval = setInterval(() => {
      checkNewBadges();
    }, 15000);

    return () => clearInterval(interval);
  }, [userEmail]);

  async function loadBadges() {
    try {
      setLoading(true);
      setError("");

      const [definitionsRes, earnedRes] = await Promise.all([
        fetch(`${API_BASE}/badges/`),
        fetch(`${API_BASE}/badges/user/${encodeURIComponent(userEmail)}`),
      ]);

      if (!definitionsRes.ok) {
        throw new Error("Failed to load badge definitions.");
      }
      if (!earnedRes.ok) {
        throw new Error("Failed to load earned badges.");
      }

      const definitions = await definitionsRes.json();
      const earned = await earnedRes.json();

      setAllBadges(definitions);
      setEarnedBadges(earned);
    } catch (err) {
      console.error(err);
      setError("Could not load badges.");
    } finally {
      setLoading(false);
    }
  }

  async function checkNewBadges() {
    try {
      const res = await fetch(
        `${API_BASE}/badges/user/${encodeURIComponent(userEmail)}/unnotified`
      );
      if (!res.ok) return;

      const newBadges = await res.json();

      if (Array.isArray(newBadges) && newBadges.length > 0) {
        setPopupBadges(newBadges);
        setShowPopup(true);
        await loadBadges();
      }
    } catch (err) {
      console.error("Error checking new badges:", err);
    }
  }

  async function dismissPopup() {
    try {
      await fetch(`${API_BASE}/badges/user/${encodeURIComponent(userEmail)}/notified`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Error marking badges notified:", err);
    } finally {
      setShowPopup(false);
      setPopupBadges([]);
      loadBadges();
    }
  }

  const groupedBadges = useMemo(() => {
    const grouped = {
      engagement: [],
      nutrition: [],
    };

    allBadges.forEach((badge) => {
      const category = badge.category?.toLowerCase() || "nutrition";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(badge);
    });

    return grouped;
  }, [allBadges]);

  const totalEarned = earnedBadges.length;
  const totalBadges = allBadges.length;
  const progressPercent = totalBadges ? Math.round((totalEarned / totalBadges) * 100) : 0;

  return (
    <>
      <section className="badgesCard">
        <div className="badgesHeader">
          <div>
            <h2>Achievement Badges</h2>
            <p className="badgesSubtext">Track progress and celebrate healthy habits</p>
          </div>

          <div className="badgesSummary">
            <div className="badgesSummaryNumber">
              {totalEarned}/{totalBadges}
            </div>
            <div className="badgesSummaryLabel">Unlocked</div>
          </div>
        </div>

        <div className="badgesProgressWrap">
          <div className="badgesProgressTop">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="badgesProgressBar">
            <div
              className="badgesProgressFill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="badgesTabs">
          <button
            className={activeTab === "all" ? "badgesTab active" : "badgesTab"}
            onClick={() => setActiveTab("all")}
          >
            All
          </button>
          <button
            className={activeTab === "earned" ? "badgesTab active" : "badgesTab"}
            onClick={() => setActiveTab("earned")}
          >
            Earned
          </button>
          <button
            className={activeTab === "locked" ? "badgesTab active" : "badgesTab"}
            onClick={() => setActiveTab("locked")}
          >
            Locked
          </button>
        </div>

        {loading ? (
          <div className="badgesEmpty">Loading badges...</div>
        ) : error ? (
          <div className="badgesEmpty">{error}</div>
        ) : (
          <div className="badgesSections">
            {Object.entries(groupedBadges).map(([category, badges]) => {
              const filtered = badges.filter((badge) => {
                const isEarned = earnedMap.has(badge.name);
                if (activeTab === "earned") return isEarned;
                if (activeTab === "locked") return !isEarned;
                return true;
              });

              if (!filtered.length) return null;

              return (
                <div key={category} className="badgesSection">
                  <div className="badgesSectionHeader">
                    {CATEGORY_LABELS[category] || category}
                  </div>

                  <div className="badgesGrid">
                    {filtered.map((badge) => {
                      const earnedInfo = earnedMap.get(badge.name);
                      const isEarned = Boolean(earnedInfo);

                      return (
                        <div
                          key={badge.name}
                          className={isEarned ? "badgeTile earned" : "badgeTile locked"}
                        >
                          <div className="badgeIconWrap">
                            <div className="badgeIcon">
                              {BADGE_ICONS[badge.name] || "🏅"}
                            </div>
                          </div>

                          <div className="badgeContent">
                            <div className="badgeNameRow">
                              <h3>{badge.name}</h3>
                              {isEarned && <span className="badgePill">Unlocked</span>}
                            </div>

                            <p>{badge.description}</p>

                            <div className="badgeMeta">
                              {isEarned
                                ? `Earned ${formatDate(earnedInfo.earned_at)}`
                                : "Keep going"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {!allBadges.length && (
              <div className="badgesEmpty">No badges found yet.</div>
            )}
          </div>
        )}
      </section>

      {showPopup && popupBadges.length > 0 && (
        <div className="badgePopupOverlay">
          <div className="badgePopup">
            <div className="badgePopupSparkle">✨</div>
            <h3>New Badge Unlocked!</h3>

            <div className="badgePopupList">
              {popupBadges.map((badge) => (
                <div key={badge.badge_name} className="badgePopupItem">
                  <div className="badgePopupIcon">
                    {BADGE_ICONS[badge.badge_name] || "🏅"}
                  </div>
                  <div>
                    <div className="badgePopupName">{badge.badge_name}</div>
                    <div className="badgePopupDate">
                      Earned {formatDate(badge.earned_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="badgePopupButton" onClick={dismissPopup}>
              Awesome
            </button>
          </div>
        </div>
      )}
    </>
  );
}