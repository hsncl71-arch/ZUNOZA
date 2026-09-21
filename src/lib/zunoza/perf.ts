/** Client-safe poll / cache helpers. No Node APIs. */

export function nextPollDelay(attempt: number, baseMs = 3000, maxMs = 8000) {
  const n = Math.max(0, attempt);
  return Math.min(maxMs, Math.round(baseMs * Math.pow(1.35, n)));
}

export function providerPollDue(lastAt: number | null | undefined, now = Date.now(), minMs = 5000) {
  if (!lastAt) return true;
  return now - lastAt >= minMs;
}
