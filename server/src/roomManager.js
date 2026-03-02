/**
 * Room Manager – in-memory room state.
 * Structured so a DB adapter could replace the Map later.
 */

import { randomBytes } from "crypto";
import config from "./config.js";

/** @type {Map<string, Room>} */
const rooms = new Map();

/**
 * @typedef {Object} Player
 * @property {string} id        - socket id
 * @property {string} name      - display name
 * @property {boolean} ready
 * @property {number} score
 * @property {boolean} connected
 */

/**
 * @typedef {Object} RoundState
 * @property {number} number            - 1-based round number
 * @property {object|null} scenario
 * @property {Map<string,string>} actions  - playerId → action text
 * @property {object|null} aiResult
 * @property {number|null} endsAt         - unix ms timestamp
 * @property {NodeJS.Timeout|null} timer
 */

/**
 * @typedef {Object} Room
 * @property {string} code
 * @property {string} hostId
 * @property {"LOBBY"|"IN_ROUND"|"SHOW_RESULTS"|"ENDED"} phase
 * @property {Map<string,Player>} players
 * @property {RoundState} round
 * @property {number[]} usedScenarioIds
 * @property {object[]} highlightReel       - funniest lines per round
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  const bytes = randomBytes(config.game.roomCodeLength);
  let code = "";
  for (let i = 0; i < config.game.roomCodeLength; i++) {
    code += chars[bytes[i] % chars.length];
  }
  // Ensure uniqueness
  return rooms.has(code) ? generateCode() : code;
}

function makePlayer(socketId, name) {
  return { id: socketId, name, ready: false, score: 0, connected: true };
}

function freshRound() {
  return {
    number: 0,
    scenario: null,
    actions: new Map(),
    aiResult: null,
    endsAt: null,
    timer: null,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export function createRoom(hostSocketId, hostName) {
  const code = generateCode();
  const host = makePlayer(hostSocketId, hostName);
  const room = {
    code,
    hostId: hostSocketId,
    phase: "LOBBY",
    players: new Map([[hostSocketId, host]]),
    round: freshRound(),
    usedScenarioIds: [],
    highlightReel: [],
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  return rooms.get(code) || null;
}

export function joinRoom(code, socketId, name) {
  const room = rooms.get(code);
  if (!room) return { error: "Room not found." };
  if (room.phase !== "LOBBY") return { error: "Game already in progress." };
  if (room.players.size >= config.game.maxPlayersPerRoom) return { error: "Room is full." };

  // Check duplicate name
  for (const p of room.players.values()) {
    if (p.name.toLowerCase() === name.toLowerCase()) {
      return { error: "Name already taken in this room." };
    }
  }

  const player = makePlayer(socketId, name);
  room.players.set(socketId, player);
  return { room };
}

export function removePlayer(socketId) {
  for (const [code, room] of rooms) {
    if (room.players.has(socketId)) {
      room.players.delete(socketId);

      // If room is empty, clean up
      if (room.players.size === 0) {
        if (room.round.timer) clearTimeout(room.round.timer);
        rooms.delete(code);
        return { code, room: null, empty: true };
      }

      // If host left, transfer to next player
      if (room.hostId === socketId) {
        const nextHost = room.players.keys().next().value;
        room.hostId = nextHost;
      }

      return { code, room, empty: false };
    }
  }
  return null;
}

export function setReady(code, socketId, ready) {
  const room = rooms.get(code);
  if (!room) return null;
  const player = room.players.get(socketId);
  if (!player) return null;
  player.ready = ready;
  return room;
}

export function getRoomForSocket(socketId) {
  for (const [code, room] of rooms) {
    if (room.players.has(socketId)) return { code, room };
  }
  return null;
}

export function serializeRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      ready: p.ready,
      score: p.score,
      connected: p.connected,
    })),
    round: {
      number: room.round.number,
      scenario: room.round.scenario
        ? {
            id: room.round.scenario.id,
            title: room.round.scenario.title,
            setup: room.round.scenario.setup,
            constraints: room.round.scenario.constraints,
            difficulty: room.round.scenario.difficulty,
            tags: room.round.scenario.tags,
          }
        : null,
      endsAt: room.round.endsAt,
      submittedPlayerIds: Array.from(room.round.actions.keys()),
      aiResult: room.round.aiResult,
    },
    usedScenarioIds: room.usedScenarioIds,
    highlightReel: room.highlightReel,
    maxRounds: config.game.maxRounds,
  };
}

export function deleteRoom(code) {
  const room = rooms.get(code);
  if (room?.round.timer) clearTimeout(room.round.timer);
  rooms.delete(code);
}

export function getAllRoomCodes() {
  return Array.from(rooms.keys());
}
