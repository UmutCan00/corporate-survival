import ChaosMeter from "../components/ChaosMeter.jsx";
import VerdictCard from "../components/VerdictCard.jsx";
import Leaderboard from "../components/Leaderboard.jsx";

export default function Results({ resultsData, roomState, myId, isHost, onNextRound, roundData }) {
  const { aiResult, roundNumber, maxRounds, leaderboard } = resultsData;
  const { roundSummary, results } = aiResult;
  const isLastRound = roundNumber >= maxRounds;

  // Sort: current player first, then alphabetically
  const sortedResults = [...results].sort((a, b) => {
    if (a.playerId === myId) return -1;
    if (b.playerId === myId) return 1;
    return 0;
  });

  const getPlayerName = (playerId) => {
    const p = roomState.players.find((pl) => pl.id === playerId);
    return p?.name || "Unknown";
  };

  return (
    <div className="page results">
      <div className="results-header">
        <h1>📋 Round {roundNumber} Results</h1>
        <ChaosMeter value={roundSummary.chaosMeter} />
      </div>

      <div className="card narration-card">
        <h2>📖 What Happened</h2>
        <div className="narration-text">
          {roundSummary.narration.split("\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="plot-beat">
          <strong>📡 Meanwhile...</strong> {roundSummary.plotBeat}
        </div>
      </div>

      <div className="verdict-grid">
        {sortedResults.map((result) => (
          <VerdictCard
            key={result.playerId}
            result={result}
            playerName={getPlayerName(result.playerId)}
            isMe={result.playerId === myId}
          />
        ))}
      </div>

      <Leaderboard entries={leaderboard} myId={myId} />

      <div className="results-actions">
        {isHost && !isLastRound && (
          <button className="btn btn-primary btn-lg" onClick={onNextRound}>
            ➡️ Next Round ({roundNumber + 1}/{maxRounds})
          </button>
        )}
        {isHost && isLastRound && (
          <button className="btn btn-primary btn-lg" onClick={onNextRound}>
            🏆 See Final Results
          </button>
        )}
        {!isHost && (
          <p className="hint">Waiting for the host to continue...</p>
        )}
      </div>
    </div>
  );
}
