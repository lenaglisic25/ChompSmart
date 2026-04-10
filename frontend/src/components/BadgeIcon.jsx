import "./BadgeIcon.css";

/** Maps API badge `name` / `badge_name` to files in /public/badges/ */
const BADGE_IMAGE_SRC = {
  "First Week Milestone": "/badges/first-week-milestone.png",
  "Love to Learn": "/badges/love-to-learn.png",
  "Curious Chef": "/badges/curious-chef.png",
  "First Log of the Day": "/badges/first-log-of-the-day.png",
  "3-Day Consistency": "/badges/three-day-consistency.png",
  "Building a Balanced Plate": "/badges/building-balanced-plate.png",
  "Sodium Smart Swap": "/badges/sodium-smart-swap.png",
  "Fiber Boost": "/badges/fiber-boost.png",
  "Hydration Hero": "/badges/hydration-hero.png",
};

const BADGE_EMOJI_FALLBACK = {
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

/**
 * @param {{ badgeName: string; variant?: "shelf" | "popup"; locked?: boolean }} props
 */
export default function BadgeIcon({ badgeName, variant = "shelf", locked = false }) {
  const src = BADGE_IMAGE_SRC[badgeName];
  const emoji = BADGE_EMOJI_FALLBACK[badgeName] || "🏅";

  if (!src) {
    return (
      <span className={`badgeArtFallback badgeArtFallback--${variant}`} aria-hidden>
        {emoji}
      </span>
    );
  }

  return (
    <span className={`badgeArtWrap badgeArtWrap--${variant}`}>
      <img
        src={src}
        alt={`${badgeName} badge`}
        className={`badgeArtImg badgeArtImg--${variant} ${locked ? "badgeArtImg--locked" : ""}`}
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}
