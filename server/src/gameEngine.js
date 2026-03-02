/**
 * Game Engine – orchestrates game flow, round lifecycle,
 * timer management, and score tracking.
 */

import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import config from "./config.js";
import { evaluateRound } from "./aiEngine.js";
import { serializeRoom } from "./roomManager.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load scenarios ───────────────────────────────────────────────────────────

let scenarios = [];

export async function loadScenarios() {
  const filePath = join(__dirname, "..", "data", "scenarios.json");
  const raw = await readFile(filePath, "utf-8");
  scenarios = JSON.parse(raw);
  console.log(`[GameEngine] Loaded ${scenarios.length} scenarios.`);
}

function pickScenario(usedIds) {
  const available = scenarios.filter((s) => !usedIds.includes(s.id));
  if (available.length === 0) {
    // All used, reset pool (unlikely with 25+ and 5 rounds)
    return scenarios[Math.floor(Math.random() * scenarios.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

// ── Score map ────────────────────────────────────────────────────────────────

const VERDICT_SCORES = {
  SURVIVE: 1,
  PROMOTED: 2,
  FIRED: 0,
  HR_INVESTIGATION: 0,
  BURNED_OUT: 0,
};

// ── Game flow ────────────────────────────────────────────────────────────────

/**
 * Start the game for a room.
 * @param {object} room
 * @param {import("socket.io").Server} io
 */
export function startGame(room, io) {
  if (room.phase !== "LOBBY") return { error: "Game already started." };

  // Check all players ready
  const players = Array.from(room.players.values());
  if (players.length < config.game.minPlayersToStart) {
    return { error: `Need at least ${config.game.minPlayersToStart} players to start.` };
  }
  const allReady = players.every((p) => p.ready);
  if (!allReady) return { error: "Not all players are ready." };

  // Reset scores
  for (const p of room.players.values()) {
    p.score = 0;
    p.ready = false;
  }
  room.highlightReel = [];

  startRound(room, io);
  return { ok: true };
}

/**
 * Start a new round.
 */
export function startRound(room, io) {
  const scenario = pickScenario(room.usedScenarioIds);
  room.usedScenarioIds.push(scenario.id);

  room.phase = "IN_ROUND";
  room.round = {
    number: (room.round?.number || 0) + 1,
    scenario,
    actions: new Map(),
    aiResult: null,
    endsAt: Date.now() + config.game.roundTimerSeconds * 1000,
    timer: null,
  };

  // Broadcast round start
  io.to(room.code).emit("room:state", serializeRoom(room));
  io.to(room.code).emit("round:started", {
    scenario: {
      id: scenario.id,
      title: scenario.title,
      setup: scenario.setup,
      constraints: scenario.constraints,
      difficulty: scenario.difficulty,
      tags: scenario.tags,
    },
    endsAt: room.round.endsAt,
    roundNumber: room.round.number,
    maxRounds: config.game.maxRounds,
  });

  // Set timer
  room.round.timer = setTimeout(() => {
    finishRound(room, io);
  }, config.game.roundTimerSeconds * 1000 + 1000); // +1s grace
}

/**
 * Submit an action for a player.
 */
export function submitAction(room, playerId, action) {
  if (room.phase !== "IN_ROUND") return { error: "Not in a round." };
  if (room.round.actions.has(playerId)) return { error: "Already submitted." };

  room.round.actions.set(playerId, action);

  return { ok: true, allSubmitted: room.round.actions.size === room.players.size };
}

/**
 * Check if all players have submitted and finish early if so.
 */
export function checkAllSubmitted(room, io) {
  if (room.round.actions.size >= room.players.size) {
    if (room.round.timer) {
      clearTimeout(room.round.timer);
      room.round.timer = null;
    }
    finishRound(room, io);
    return true;
  }
  return false;
}

/**
 * Finish a round: call AI, calculate scores, broadcast results.
 */
async function finishRound(room, io) {
  if (room.phase !== "IN_ROUND") return; // Already finished (timer + early submit race)
  room.phase = "SHOW_RESULTS";

  if (room.round.timer) {
    clearTimeout(room.round.timer);
    room.round.timer = null;
  }

  // Build player actions array
  const playerActions = [];
  for (const [pid, player] of room.players) {
    const action = room.round.actions.get(pid) || "Did nothing. Stared blankly at the screen.";
    playerActions.push({ playerId: pid, name: player.name, action });
  }

  // Call AI
  io.to(room.code).emit("round:evaluating", { message: "The Corporate Fate Engine is deliberating..." });

  const aiResult = await evaluateRound(room.round.scenario, playerActions);
  room.round.aiResult = aiResult;

  // Update scores
  for (const result of aiResult.results) {
    const player = room.players.get(result.playerId);
    if (player) {
      player.score += VERDICT_SCORES[result.verdict] || 0;
    }
  }

  // Collect highlight reel entries
  for (const result of aiResult.results) {
    const player = room.players.get(result.playerId);
    if (player && result.funnyLine) {
      room.highlightReel.push({
        round: room.round.number,
        playerName: player.name,
        verdict: result.verdict,
        funnyLine: result.funnyLine,
      });
    }
  }

  // Broadcast results
  io.to(room.code).emit("round:results", {
    aiResult,
    roundNumber: room.round.number,
    maxRounds: config.game.maxRounds,
    leaderboard: getLeaderboard(room),
  });
  io.to(room.code).emit("room:state", serializeRoom(room));
}

/**
 * Advance to the next round or end the game.
 */
export function nextRound(room, io) {
  if (room.phase !== "SHOW_RESULTS") return { error: "Can't advance now." };

  if (room.round.number >= config.game.maxRounds) {
    endGame(room, io);
    return { ok: true, ended: true };
  }

  startRound(room, io);
  return { ok: true, ended: false };
}

/**
 * End the game.
 */
function endGame(room, io) {
  room.phase = "ENDED";
  const leaderboard = getLeaderboard(room);

  // Pick top 5 funniest lines for highlight reel
  const highlightReel = room.highlightReel
    .sort(() => Math.random() - 0.5) // shuffle
    .slice(0, Math.min(room.highlightReel.length, 8));

  io.to(room.code).emit("game:ended", { leaderboard, highlightReel });
  io.to(room.code).emit("room:state", serializeRoom(room));
}

/**
 * Get sorted leaderboard.
 */
function getLeaderboard(room) {
  return Array.from(room.players.values())
    .map((p) => ({ id: p.id, name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Return room to lobby (for "play again").
 */
export function returnToLobby(room, io) {
  room.phase = "LOBBY";
  room.round = {
    number: 0,
    scenario: null,
    actions: new Map(),
    aiResult: null,
    endsAt: null,
    timer: null,
  };
  room.usedScenarioIds = [];
  room.highlightReel = [];
  for (const p of room.players.values()) {
    p.score = 0;
    p.ready = false;
  }
  io.to(room.code).emit("room:state", serializeRoom(room));
}
