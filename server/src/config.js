import "dotenv/config";

/** @type {import('./types').Config} */
const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  corsOrigin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === "production" ? false : "http://localhost:5173"),
  nodeEnv: process.env.NODE_ENV || "development",

  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o",
  },

  game: {
    maxPlayersPerRoom: parseInt(process.env.MAX_PLAYERS_PER_ROOM || "8", 10),
    minPlayersToStart: 2,
    roundTimerSeconds: parseInt(process.env.ROUND_TIMER_SECONDS || "45", 10),
    maxRounds: parseInt(process.env.MAX_ROUNDS || "5", 10),
    maxActionLength: 280,
    maxNameLength: 24,
    roomCodeLength: 6,
  },

  rateLimit: {
    windowMs: 60_000,
    maxRequests: 30,
  },
};

export default config;
