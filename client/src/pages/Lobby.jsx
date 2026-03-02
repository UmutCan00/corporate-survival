import { useState } from "react";

export default function Lobby({ roomState, myId, isHost, onReady, onStartGame, onLeave, error }) {
  const [copied, setCopied] = useState(false);
  const me = roomState.players.find((p) => p.id === myId);
  const allReady = roomState.players.length >= 2 && roomState.players.every((p) => p.ready);

  const copyCode = () => {
    navigator.clipboard.writeText(roomState.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="page lobby">
      <div className="lobby-header">
        <h1>🏢 Lobby</h1>
        <div className="room-code-display" onClick={copyCode} title="Click to copy">
          <span className="room-code-label">Room Code</span>
          <span className="room-code-value">{roomState.code}</span>
          <span className="room-code-copy">{copied ? "✓ Copied!" : "📋 Copy"}</span>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card players-card">
        <h2>Players ({roomState.players.length}/8)</h2>
        <ul className="player-list">
          {roomState.players.map((p) => (
            <li key={p.id} className={`player-item ${p.ready ? "ready" : ""}`}>
              <span className="player-name">
                {p.name}
                {p.id === roomState.hostId && <span className="host-badge">👑 Host</span>}
                {p.id === myId && <span className="you-badge">You</span>}
              </span>
              <span className={`ready-status ${p.ready ? "ready" : "not-ready"}`}>
                {p.ready ? "✅ Ready" : "⏳ Not Ready"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="lobby-actions">
        <button
          className={`btn btn-lg ${me?.ready ? "btn-secondary" : "btn-primary"}`}
          onClick={() => onReady(!me?.ready)}
        >
          {me?.ready ? "❌ Unready" : "✅ Ready Up"}
        </button>

        {isHost && (
          <button
            className="btn btn-primary btn-lg btn-start"
            disabled={!allReady}
            onClick={onStartGame}
            title={!allReady ? "All players must be ready" : "Start the game!"}
          >
            🎮 Start Game
          </button>
        )}

        {!isHost && !allReady && (
          <p className="hint">Waiting for all players to ready up and host to start...</p>
        )}
        {!isHost && allReady && (
          <p className="hint">All ready! Waiting for the host to start...</p>
        )}
      </div>

      <button className="btn btn-ghost btn-leave" onClick={onLeave}>
        🚪 Leave Room
      </button>
    </div>
  );
}
