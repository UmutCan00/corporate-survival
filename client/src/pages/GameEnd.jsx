import Leaderboard from "../components/Leaderboard.jsx";

export default function GameEnd({ endData, roomState, myId, isHost, onReturnToLobby, onLeave }) {
  const { leaderboard, highlightReel } = endData;
  const winner = leaderboard[0];
  const isWinner = winner?.id === myId;

  return (
    <div className="page game-end">
      <div className="trophy-section">
        <div className="trophy-emoji">🏆</div>
        <h1>Game Over!</h1>
        <div className="winner-announce">
          {isWinner ? (
            <>
              <h2 className="winner-name glow">You survived the corporation!</h2>
              <p>Against all odds, HR, and middle management – you prevailed.</p>
            </>
          ) : (
            <>
              <h2 className="winner-name glow">{winner?.name} survives!</h2>
              <p>They navigated corporate hell better than everyone. For now.</p>
            </>
          )}
          <div className="winner-score">{winner?.score} points</div>
        </div>
      </div>

      <Leaderboard entries={leaderboard} myId={myId} final />

      {highlightReel.length > 0 && (
        <div className="card highlight-card">
          <h2>🎬 Highlight Reel</h2>
          <div className="highlight-list">
            {highlightReel.map((h, i) => (
              <div key={i} className="highlight-item">
                <div className="highlight-meta">
                  <span className="highlight-player">{h.playerName}</span>
                  <span className={`verdict-badge verdict-${h.verdict}`}>{h.verdict.replace("_", " ")}</span>
                  <span className="highlight-round">Round {h.round}</span>
                </div>
                <blockquote className="highlight-quote">"{h.funnyLine}"</blockquote>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="end-actions">
        {isHost && (
          <button className="btn btn-primary btn-lg" onClick={onReturnToLobby}>
            🔄 Play Again
          </button>
        )}
        {!isHost && (
          <p className="hint">Waiting for host to start a new game...</p>
        )}
        <button className="btn btn-ghost" onClick={onLeave}>
          🚪 Leave
        </button>
      </div>
    </div>
  );
}
