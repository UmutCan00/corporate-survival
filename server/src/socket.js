/**
 * Socket.IO event handlers – maps client events to game logic.
 */

import {
  createRoom,
  joinRoom,
  setReady,
  removePlayer,
  getRoomForSocket,
  getRoom,
  serializeRoom,
} from "./roomManager.js";
import {
  startGame,
  submitAction,
  checkAllSubmitted,
  nextRound,
  returnToLobby,
} from "./gameEngine.js";
import { validateName, validateRoomCode, validateAction } from "./validation.js";
import { rateLimitMiddleware, clearRateLimit } from "./rateLimiter.js";

/**
 * Initialize Socket.IO handlers.
 * @param {import("socket.io").Server} io
 */
export function initSocket(io) {
  io.use(rateLimitMiddleware);

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ── room:create ─────────────────────────────────────────────────────
    socket.on("room:create", (data, ack) => {
      const cb = typeof ack === "function" ? ack : () => {};

      const nameResult = validateName(data?.name);
      if (!nameResult.valid) return cb({ error: nameResult.error });

      const room = createRoom(socket.id, nameResult.name);
      socket.join(room.code);
      console.log(`[Room] Created ${room.code} by ${nameResult.name}`);

      cb({ ok: true, roomCode: room.code });
      io.to(room.code).emit("room:state", serializeRoom(room));
    });

    // ── room:join ───────────────────────────────────────────────────────
    socket.on("room:join", (data, ack) => {
      const cb = typeof ack === "function" ? ack : () => {};

      const nameResult = validateName(data?.name);
      if (!nameResult.valid) return cb({ error: nameResult.error });

      const codeResult = validateRoomCode(data?.roomCode);
      if (!codeResult.valid) return cb({ error: codeResult.error });

      const result = joinRoom(codeResult.code, socket.id, nameResult.name);
      if (result.error) return cb({ error: result.error });

      socket.join(codeResult.code);
      console.log(`[Room] ${nameResult.name} joined ${codeResult.code}`);

      cb({ ok: true, roomCode: codeResult.code });
      io.to(codeResult.code).emit("room:state", serializeRoom(result.room));
    });

    // ── room:ready ──────────────────────────────────────────────────────
    socket.on("room:ready", (data) => {
      const found = getRoomForSocket(socket.id);
      if (!found) return;

      const ready = typeof data?.ready === "boolean" ? data.ready : true;
      const room = setReady(found.code, socket.id, ready);
      if (room) {
        io.to(found.code).emit("room:state", serializeRoom(room));
      }
    });

    // ── game:start ──────────────────────────────────────────────────────
    socket.on("game:start", (_, ack) => {
      const cb = typeof ack === "function" ? ack : () => {};
      const found = getRoomForSocket(socket.id);
      if (!found) return cb({ error: "Not in a room." });

      const { room, code } = found;
      if (room.hostId !== socket.id) return cb({ error: "Only the host can start the game." });

      const result = startGame(room, io);
      if (result.error) return cb({ error: result.error });

      cb({ ok: true });
    });

    // ── round:submit ────────────────────────────────────────────────────
    socket.on("round:submit", (data, ack) => {
      const cb = typeof ack === "function" ? ack : () => {};
      const found = getRoomForSocket(socket.id);
      if (!found) return cb({ error: "Not in a room." });

      const { room, code } = found;
      if (room.phase !== "IN_ROUND") return cb({ error: "Not in a round." });

      const actionResult = validateAction(data?.action);
      if (!actionResult.valid) return cb({ error: actionResult.error });

      const submitResult = submitAction(room, socket.id, actionResult.action);
      if (submitResult.error) return cb({ error: submitResult.error });

      cb({ ok: true });

      // Broadcast updated submission count
      io.to(code).emit("round:submission", {
        playerId: socket.id,
        submittedCount: room.round.actions.size,
        totalPlayers: room.players.size,
      });

      // Check if all submitted → finish early
      checkAllSubmitted(room, io);
    });

    // ── round:next ──────────────────────────────────────────────────────
    socket.on("round:next", (_, ack) => {
      const cb = typeof ack === "function" ? ack : () => {};
      const found = getRoomForSocket(socket.id);
      if (!found) return cb({ error: "Not in a room." });

      const { room } = found;
      if (room.hostId !== socket.id) return cb({ error: "Only the host can advance." });

      const result = nextRound(room, io);
      if (result.error) return cb({ error: result.error });

      cb({ ok: true });
    });

    // ── game:returnToLobby ──────────────────────────────────────────────
    socket.on("game:returnToLobby", () => {
      const found = getRoomForSocket(socket.id);
      if (!found) return;
      const { room } = found;
      if (room.hostId !== socket.id) return;
      returnToLobby(room, io);
    });

    // ── disconnect ──────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      clearRateLimit(socket.id);

      const result = removePlayer(socket.id);
      if (result && !result.empty && result.room) {
        io.to(result.code).emit("room:state", serializeRoom(result.room));
      }
    });
  });
}
