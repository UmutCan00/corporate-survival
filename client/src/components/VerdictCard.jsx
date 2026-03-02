const VERDICT_CONFIG = {
  SURVIVE: { emoji: "😮‍💨", label: "SURVIVED", color: "#22c55e", bg: "#052e16" },
  PROMOTED: { emoji: "🚀", label: "PROMOTED", color: "#a78bfa", bg: "#1e1145" },
  FIRED: { emoji: "📦", label: "FIRED", color: "#ef4444", bg: "#450a0a" },
  HR_INVESTIGATION: { emoji: "⚖️", label: "HR INVESTIGATION", color: "#f97316", bg: "#431407" },
  BURNED_OUT: { emoji: "🫠", label: "BURNED OUT", color: "#94a3b8", bg: "#1e293b" },
};

export default function VerdictCard({ result, playerName, isMe }) {
  const cfg = VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG.SURVIVE;

  return (
    <div
      className={`card verdict-card ${isMe ? "verdict-mine" : ""}`}
      style={{ borderColor: cfg.color, backgroundColor: cfg.bg }}
    >
      <div className="verdict-header">
        <span className="verdict-emoji">{cfg.emoji}</span>
        <div className="verdict-info">
          <span className="verdict-player">{playerName}{isMe ? " (You)" : ""}</span>
          <span className="verdict-label" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
      </div>
      <p className="verdict-reason">{result.reason}</p>
      <blockquote className="verdict-funny" style={{ borderLeftColor: cfg.color }}>
        "{result.funnyLine}"
      </blockquote>
    </div>
  );
}
