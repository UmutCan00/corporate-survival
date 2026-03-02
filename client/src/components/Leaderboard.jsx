export default function Leaderboard({ entries, myId, final = false }) {
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className={`card leaderboard-card ${final ? "leaderboard-final" : ""}`}>
      <h2>{final ? "🏆 Final Standings" : "📊 Leaderboard"}</h2>
      <ol className="leaderboard-list">
        {entries.map((entry, i) => (
          <li
            key={entry.id}
            className={`leaderboard-entry ${entry.id === myId ? "leaderboard-me" : ""}`}
          >
            <span className="leaderboard-rank">
              {medals[i] || `#${i + 1}`}
            </span>
            <span className="leaderboard-name">
              {entry.name}
              {entry.id === myId && <span className="you-badge">You</span>}
            </span>
            <span className="leaderboard-score">{entry.score} pts</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
