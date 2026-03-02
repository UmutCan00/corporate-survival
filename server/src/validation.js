/**
 * Input validation & sanitization utilities.
 * Treats all player input as untrusted.
 */

import config from "./config.js";

// ── Regex patterns ──────────────────────────────────────────────────────────
const ROOM_CODE_RE = /^[A-Z0-9]{4,8}$/;
const NAME_RE = /^[\w\s\-!?.,']{1,24}$/;

// Known prompt-injection phrases to strip / reject
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|system)\s*(instructions|prompts|rules)?/i,
  /you\s+are\s+now\s+/i,
  /reveal\s+(your\s+)?(system|hidden|secret)/i,
  /override\s+(system|rules|instructions)/i,
  /disregard\s+(everything|all|system)/i,
  /forget\s+(your|all|previous)\s*(instructions|rules|prompts)?/i,
  /act\s+as\s+if\s+you\s+are/i,
  /pretend\s+(you|to\s+be)/i,
  /new\s+instructions?:/i,
  /system\s*prompt/i,
  /\[\s*INST\s*\]/i,
  /<\|?(system|im_start|im_end)\|?>/i,
];

/**
 * Sanitize a plain-text string: trim, collapse whitespace, limit length.
 */
export function sanitizeText(raw, maxLen = 280) {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // strip control chars
    .replace(/\s+/g, " ")
    .slice(0, maxLen);
}

/**
 * Validate display name.
 * @returns {{ valid: boolean, name?: string, error?: string }}
 */
export function validateName(raw) {
  const name = sanitizeText(raw, config.game.maxNameLength);
  if (!name || name.length < 1) {
    return { valid: false, error: "Name is required (1–24 characters)." };
  }
  if (!NAME_RE.test(name)) {
    return { valid: false, error: "Name contains invalid characters." };
  }
  return { valid: true, name };
}

/**
 * Validate room code.
 * @returns {{ valid: boolean, code?: string, error?: string }}
 */
export function validateRoomCode(raw) {
  if (typeof raw !== "string") return { valid: false, error: "Room code is required." };
  const code = raw.trim().toUpperCase();
  if (!ROOM_CODE_RE.test(code)) {
    return { valid: false, error: "Invalid room code format." };
  }
  return { valid: true, code };
}

/**
 * Validate a player action submission.
 * @returns {{ valid: boolean, action?: string, error?: string, injectionDetected?: boolean }}
 */
export function validateAction(raw) {
  const action = sanitizeText(raw, config.game.maxActionLength);
  if (!action || action.length < 1) {
    return { valid: false, error: "Action cannot be empty." };
  }
  if (action.length > config.game.maxActionLength) {
    return { valid: false, error: `Action too long (max ${config.game.maxActionLength} chars).` };
  }

  // Check for prompt injection attempts
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(action)) {
      return {
        valid: false,
        error: "Nice try! Your action contains suspicious instructions. Play the game!",
        injectionDetected: true,
      };
    }
  }

  return { valid: true, action };
}

/**
 * Escape player text before embedding in an AI prompt.
 * Wraps in XML-style tags so the model can distinguish data from instructions.
 */
export function escapeForPrompt(text) {
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;");
}
