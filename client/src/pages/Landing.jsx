import { useState } from "react";

export default function Landing({ onCreateRoom, onJoinRoom, error, clearError }) {
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onCreateRoom(name.trim());
    setLoading(false);
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim() || !roomCode.trim()) return;
    setLoading(true);
    await onJoinRoom(roomCode.trim().toUpperCase(), name.trim());
    setLoading(false);
  };

  return (
    <div className="page landing">
      <div className="landing-hero">
        <div className="logo">🏢</div>
        <h1>Corporate Survival</h1>
        <p className="tagline">
          Navigate absurd office scenarios. Survive the AI's judgment.
          <br />
          <span className="subtitle">Don't get fired. (Or do – it's funnier that way.)</span>
        </p>
      </div>

      {error && (
        <div className="error-banner" onClick={clearError}>
          {error} <span className="dismiss">✕</span>
        </div>
      )}

      {!mode && (
        <div className="landing-actions">
          <button className="btn btn-primary btn-lg" onClick={() => setMode("create")}>
            🚀 Create Room
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => setMode("join")}>
            🔗 Join Room
          </button>
        </div>
      )}

      {mode === "create" && (
        <form className="card form-card" onSubmit={handleCreate}>
          <h2>Create a Room</h2>
          <label>
            <span>Your Display Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Corporate Chad"
              maxLength={24}
              autoFocus
              disabled={loading}
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
              {loading ? "Creating..." : "Create Room"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setMode(null); clearError(); }}>
              Back
            </button>
          </div>
        </form>
      )}

      {mode === "join" && (
        <form className="card form-card" onSubmit={handleJoin}>
          <h2>Join a Room</h2>
          <label>
            <span>Your Display Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Synergy Steve"
              maxLength={24}
              autoFocus
              disabled={loading}
            />
          </label>
          <label>
            <span>Room Code</span>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g., ABC123"
              maxLength={8}
              className="room-code-input"
              disabled={loading}
            />
          </label>
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !name.trim() || !roomCode.trim()}
            >
              {loading ? "Joining..." : "Join Room"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setMode(null); clearError(); }}>
              Back
            </button>
          </div>
        </form>
      )}

      <footer className="landing-footer">
        <p>2–8 players · 5 rounds · Powered by AI · No actual careers were harmed</p>
      </footer>
    </div>
  );
}
