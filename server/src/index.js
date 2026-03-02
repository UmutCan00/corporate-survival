/**
 * Server entry point – Express + Socket.IO.
 */

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import config from "./config.js";
import { initSocket } from "./socket.js";
import { loadScenarios } from "./gameEngine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(config.corsOrigin ? { origin: config.corsOrigin } : {}));
app.use(express.json({ limit: "1kb" }));

// HTTP rate limiter (for any REST endpoints)
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 60,
    message: { error: "Too many requests." },
  })
);

// ── Health check ─────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ── Serve static client in production ────────────────────────────────────────

if (config.nodeEnv === "production") {
  const clientDist = join(__dirname, "..", "..", "client", "dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(join(clientDist, "index.html"));
  });
}

// ── Socket.IO ────────────────────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: config.corsOrigin
    ? { origin: config.corsOrigin, methods: ["GET", "POST"] }
    : undefined,
  pingTimeout: 30_000,
  pingInterval: 10_000,
});

initSocket(io);

// ── Start ────────────────────────────────────────────────────────────────────

async function main() {
  await loadScenarios();

  const host = config.nodeEnv === "production" ? "0.0.0.0" : "localhost";
  httpServer.listen(config.port, host, () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║   🏢 Corporate Survival Server                    ║
║   Port: ${String(config.port).padEnd(41)}║
║   Host: ${host.padEnd(41)}║
║   Env:  ${config.nodeEnv.padEnd(41)}║
║   CORS: ${String(config.corsOrigin || "same-origin").padEnd(41)}║
╚════════════════════════════════════════════════════╝
    `);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
