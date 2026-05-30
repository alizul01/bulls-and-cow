const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROOM_CODE_REGEX = /^[A-HJ-NP-Z2-9]{5}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_REGEX.test(code.toUpperCase());
}

export function isValidPlayerName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 20;
}

export function sanitizeName(name: string): string {
  return name.trim().slice(0, 20);
}

export function sanitizeCode(code: string): string {
  return code.trim().toUpperCase().slice(0, 5);
}

const messageDedupCache = new Map<string, Set<string>>();

export function isDuplicateMessage(roomCode: string, messageId: string): boolean {
  if (!messageId) return false;
  let seen = messageDedupCache.get(roomCode);
  if (!seen) {
    seen = new Set();
    messageDedupCache.set(roomCode, seen);
  }
  if (seen.has(messageId)) return true;
  seen.add(messageId);
  if (seen.size > 200) {
    const entries = [...seen];
    seen = new Set(entries.slice(-100));
    messageDedupCache.set(roomCode, seen);
  }
  return false;
}

export function clearRoomMessageDedup(roomCode: string): void {
  messageDedupCache.delete(roomCode);
}

const rateLimits = new Map<string, { tokens: number; lastRefill: number }>();
const MAX_TOKENS = 3;
const REFILL_RATE = 1;
const REFILL_INTERVAL_MS = 1000;
const CREATE_JOIN_INTERVAL_MS = 3000;

export function checkRateLimit(clientId: string, action: "guess" | "secret" | "create_join"): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();

  if (action === "create_join") {
    const lastKey = `create_join_${clientId}`;
    const bucket = rateLimits.get(lastKey);
    if (bucket) {
      const elapsed = now - bucket.lastRefill;
      if (elapsed < CREATE_JOIN_INTERVAL_MS) {
        return { allowed: false, retryAfterMs: CREATE_JOIN_INTERVAL_MS - elapsed };
      }
    }
    rateLimits.set(lastKey, { tokens: 0, lastRefill: now });
    return { allowed: true };
  }

  const key = `${action}_${clientId}`;
  let bucket = rateLimits.get(key);
  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    rateLimits.set(key, bucket);
  }

  const elapsed = now - bucket.lastRefill;
  const refillTokens = Math.floor(elapsed / REFILL_INTERVAL_MS) * REFILL_RATE;
  if (refillTokens > 0) {
    bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + refillTokens);
    bucket.lastRefill = now;
  }

  if (bucket.tokens < 1) {
    const timeToNextToken = REFILL_INTERVAL_MS - (elapsed % REFILL_INTERVAL_MS);
    return { allowed: false, retryAfterMs: timeToNextToken };
  }

  bucket.tokens--;
  return { allowed: true };
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of rateLimits) {
      if (now - bucket.lastRefill > CREATE_JOIN_INTERVAL_MS * 2) {
        rateLimits.delete(key);
      }
    }
  }, 60_000);
}
