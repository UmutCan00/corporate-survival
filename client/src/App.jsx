import { useState, useEffect, useCallback } from "react";
import socket from "./socket.js";
import Landing from "./pages/Landing.jsx";
import Lobby from "./pages/Lobby.jsx";
import Round from "./pages/Round.jsx";
import Results from "./pages/Results.jsx";
import GameEnd from "./pages/GameEnd.jsx";

export default function App() {
  const [roomState, setRoomState] = useState(null);
  const [roundData, setRoundData] = useState(null);
  const [resultsData, setResultsData] = useState(null);
  const [endData, setEndData] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState(null);
  const [myId, setMyId] = useState(null);
  const [connected, setConnected] = useState(false);

  // ── Socket lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      setMyId(socket.id);
      setConnected(true);
      setError(null);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", () => {
      setError("Connection failed. Is the server running?");
    });

    socket.on("room:state", (state) => {
      setRoomState(state);
      // Clear evaluating flag when we leave IN_ROUND
      if (state.phase !== "IN_ROUND") setEvaluating(false);
    });

    socket.on("round:started", (data) => {
      setRoundData(data);
      setResultsData(null);
      setEvaluating(false);
    });

    socket.on("round:evaluating", () => {
      setEvaluating(true);
    });

    socket.on("round:results", (data) => {
      setResultsData(data);
      setEvaluating(false);
    });

    socket.on("round:submission", () => {
      // Force a re-render with fresh room state (submission counts)
    });

    socket.on("game:ended", (data) => {
      setEndData(data);
    });

    socket.on("error:rate_limit", (data) => {
      setError(data.message);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("room:state");
      socket.off("round:started");
      socket.off("round:evaluating");
      socket.off("round:results");
      socket.off("round:submission");
      socket.off("game:ended");
      socket.off("error:rate_limit");
      socket.disconnect();
    };
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────
  const handleCreateRoom = useCallback((name) => {
    return new Promise((resolve) => {
      socket.emit("room:create", { name }, (res) => {
        if (res.error) {
          setError(res.error);
          resolve(false);
        } else {
          setError(null);
          resolve(true);
        }
      });
    });
  }, []);

  const handleJoinRoom = useCallback((roomCode, name) => {
    return new Promise((resolve) => {
      socket.emit("room:join", { roomCode, name }, (res) => {
        if (res.error) {
          setError(res.error);
          resolve(false);
        } else {
          setError(null);
          resolve(true);
        }
      });
    });
  }, []);

  const handleReady = useCallback((ready) => {
    socket.emit("room:ready", { ready });
  }, []);

  const handleStartGame = useCallback(() => {
    socket.emit("game:start", {}, (res) => {
      if (res?.error) setError(res.error);
    });
  }, []);

  const handleSubmitAction = useCallback((action) => {
    return new Promise((resolve) => {
      socket.emit("round:submit", { action }, (res) => {
        if (res?.error) {
          setError(res.error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, []);

  const handleNextRound = useCallback(() => {
    socket.emit("round:next", {}, (res) => {
      if (res?.error) setError(res.error);
    });
  }, []);

  const handleReturnToLobby = useCallback(() => {
    setRoundData(null);
    setResultsData(null);
    setEndData(null);
    socket.emit("game:returnToLobby");
  }, []);

  const handleLeave = useCallback(() => {
    setRoomState(null);
    setRoundData(null);
    setResultsData(null);
    setEndData(null);
    socket.disconnect();
    socket.connect();
  }, []);

  // ── Render ──────────────────────────────────────────────────────────
  const phase = roomState?.phase;

  const renderPage = () => {
    // No room joined yet
    if (!roomState) {
      return (
        <Landing
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          error={error}
          clearError={() => setError(null)}
        />
      );
    }

    // Game ended
    if (phase === "ENDED" && endData) {
      return (
        <GameEnd
          endData={endData}
          roomState={roomState}
          myId={myId}
          isHost={roomState.hostId === myId}
          onReturnToLobby={handleReturnToLobby}
          onLeave={handleLeave}
        />
      );
    }

    // Show results
    if (phase === "SHOW_RESULTS" && resultsData) {
      return (
        <Results
          resultsData={resultsData}
          roomState={roomState}
          myId={myId}
          isHost={roomState.hostId === myId}
          onNextRound={handleNextRound}
          roundData={roundData}
        />
      );
    }

    // In round
    if (phase === "IN_ROUND" && roundData) {
      return (
        <Round
          roundData={roundData}
          roomState={roomState}
          myId={myId}
          onSubmit={handleSubmitAction}
          evaluating={evaluating}
          error={error}
        />
      );
    }

    // Lobby
    return (
      <Lobby
        roomState={roomState}
        myId={myId}
        isHost={roomState.hostId === myId}
        onReady={handleReady}
        onStartGame={handleStartGame}
        onLeave={handleLeave}
        error={error}
      />
    );
  };

  return (
    <div className="app">
      {!connected && roomState && (
        <div className="connection-bar">
          ⚠️ Reconnecting to server...
        </div>
      )}
      {renderPage()}
    </div>
  );
}
