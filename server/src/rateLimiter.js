/**
 * Simple per-socket rate limiter.
 * Tracks event counts per socket in a sliding window.
 */

import config from "./config.js";

/** @type {Map<string, { count: number, resetAt: number }>} */
const buckets = new Map();

// Cleanup stale buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 5 * 60_000);

/**
 * Check if a socket has exceeded its rate limit.
 * @param {string} socketId
 * @returns {boolean} true if request is allowed, false if rate-limited
 */
export function checkRateLimit(socketId) {
  const now = Date.now();
  let bucket = buckets.get(socketId);

  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + config.rateLimit.windowMs };
    buckets.set(socketId, bucket);
  }

  bucket.count++;
  return bucket.count <= config.rateLimit.maxRequests;
}

/**
 * Remove a socket's rate-limit bucket (on disconnect).
 */
export function clearRateLimit(socketId) {
  buckets.delete(socketId);
}

/**
 * Socket.IO middleware that enforces rate limiting on every event.
 */
export function rateLimitMiddleware(socket, next) {
  const originalEmit = socket.onevent;
  socket.onevent = function (packet) {
    if (!checkRateLimit(socket.id)) {
      socket.emit("error:rate_limit", { message: "Too many requests. Slow down!" });
      return;
    }
    originalEmit.call(socket, packet);
  };
  next();
}
