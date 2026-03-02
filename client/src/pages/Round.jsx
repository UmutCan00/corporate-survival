import { useState, useEffect, useRef } from "react";
import Timer from "../components/Timer.jsx";
import ChaosMeter from "../components/ChaosMeter.jsx";

export default function Round({ roundData, roomState, myId, onSubmit, evaluating, error }) {
  const [action, setAction] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  const scenario = roundData.scenario;
  const maxLen = 280;

  // Check if already submitted (reconnection case)
  useEffect(() => {
    if (roomState.round?.submittedPlayerIds?.includes(myId)) {
      setSubmitted(true);
    }
  }, [roomState, myId]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current && !submitted) {
      inputRef.current.focus();
    }
  }, [submitted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!action.trim() || submitted || submitting) return;
    setSubmitting(true);
    const ok = await onSubmit(action.trim());
    if (ok) setSubmitted(true);
    setSubmitting(false);
  };

  const submittedCount = roomState.round?.submittedPlayerIds?.length || 0;
  const totalPlayers = roomState.players.length;

  // Evaluating state (AI working)
  if (evaluating) {
    return (
      <div className="page round">
        <div className="evaluating-screen">
          <div className="evaluating-animation">
            <div className="spinner"></div>
            <h2>🤖 The Corporate Fate Engine is deliberating...</h2>
            <p className="evaluating-flavor">
              {[
                "Consulting the org chart...",
                "Reviewing your 360 feedback...",
                "Checking with Legal...",
                "Running it by the VP of Vibes...",
                "Cross-referencing with the employee handbook...",
                "Calculating your synergy quotient...",
              ][Math.floor(Math.random() * 6)]}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page round">
      <div className="round-header">
        <div className="round-info">
          <span className="round-badge">
            Round {roundData.roundNumber} / {roundData.maxRounds}
          </span>
          <span className="difficulty-badge" data-level={scenario.difficulty}>
            {"⭐".repeat(scenario.difficulty)} Difficulty
          </span>
        </div>
        <Timer endsAt={roundData.endsAt} />
      </div>

      <div className="card scenario-card">
        <h2 className="scenario-title">{scenario.title}</h2>
        <div className="scenario-tags">
          {scenario.tags.map((tag) => (
            <span key={tag} className="tag">
              #{tag}
            </span>
          ))}
        </div>
        <p className="scenario-setup">{scenario.setup}</p>
        <div className="scenario-constraints">
          <h3>⚠️ Constraints</h3>
          <ul>
            {scenario.constraints.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      </div>

      {!submitted ? (
        <form className="card action-card" onSubmit={handleSubmit}>
          <h3>💡 What do you do?</h3>
          <textarea
            ref={inputRef}
            value={action}
            onChange={(e) => setAction(e.target.value.slice(0, maxLen))}
            placeholder="Describe your action in 280 characters or less..."
            maxLength={maxLen}
            rows={3}
            disabled={submitting}
          />
          <div className="action-footer">
            <span className={`char-count ${action.length > maxLen - 20 ? "warn" : ""}`}>
              {action.length}/{maxLen}
            </span>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!action.trim() || submitting}
            >
              {submitting ? "Locking in..." : "🔒 Lock In Action"}
            </button>
          </div>
          {error && <div className="error-text">{error}</div>}
        </form>
      ) : (
        <div className="card submitted-card">
          <h3>✅ Action Locked In!</h3>
          <p className="submitted-action">"{action}"</p>
          <p className="waiting-text">
            Waiting for others... ({submittedCount}/{totalPlayers} submitted)
          </p>
          <div className="submission-dots">
            {roomState.players.map((p) => (
              <span
                key={p.id}
                className={`sub-dot ${
                  roomState.round?.submittedPlayerIds?.includes(p.id) ? "done" : ""
                }`}
                title={p.name}
              >
                {roomState.round?.submittedPlayerIds?.includes(p.id) ? "✅" : "⏳"}
                <span className="sub-dot-name">{p.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
