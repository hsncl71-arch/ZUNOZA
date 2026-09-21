import { providerPollDue } from "./perf.ts";

/** In-process durability helpers. A downed provider must not take all of ZUNOZA with it. */

type Breaker = { fails: number; openUntil: number };

const breakers = new Map<string, Breaker>();
const pollAt = new Map<string, number>();
const persistLocks = new Set<string>();
const seenIdk = new Map<string, number>();

const OPEN_MS = 20_000;
const FAIL_OPEN = 3;
const IDK_TTL_MS = 6 * 60 * 60 * 1000;

export function isTransientProviderError(err: unknown) {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err || "");
  return /429|502|503|504|TimeoutError|AbortError|kota|geçici|timeout|ECONNRESET|fetch failed|network/i.test(msg);
}

export function circuitOpen(name: string, now = Date.now()) {
  const cur = breakers.get(name);
  return Boolean(cur && cur.openUntil > now);
}

export function circuitAllow(name: string, now = Date.now()) {
  if (circuitOpen(name, now)) {
    throw new Error("Sağlayıcı geçici olarak yanıt vermiyor. Biraz sonra tekrar deneyin.");
  }
}

export function circuitOk(name: string) {
  breakers.delete(name);
}

export function circuitFail(name: string, err?: unknown, now = Date.now()) {
  if (err && !isTransientProviderError(err) && !/5\d\d/.test(err instanceof Error ? err.message : "")) {
    return;
  }
  const cur = breakers.get(name) || { fails: 0, openUntil: 0 };
  cur.fails += 1;
  if (cur.fails >= FAIL_OPEN) {
    cur.openUntil = now + OPEN_MS;
    cur.fails = 0;
  }
  breakers.set(name, cur);
}

export function shouldPollProvider(jobId: string, minMs = 5000, now = Date.now()) {
  const last = pollAt.get(jobId) || 0;
  if (!providerPollDue(last, now, minMs)) return false;
  pollAt.set(jobId, now);
  if (pollAt.size > 400) {
    for (const [id, at] of pollAt) {
      if (now - at > 15 * 60_000) pollAt.delete(id);
    }
  }
  return true;
}

export function markProviderPolled(jobId: string, now = Date.now()) {
  pollAt.set(jobId, now);
}

export function beginPersist(jobId: string) {
  if (persistLocks.has(jobId)) return false;
  persistLocks.add(jobId);
  return true;
}

export function endPersist(jobId: string) {
  persistLocks.delete(jobId);
}

export function claimIdempotency(key: string | null | undefined, now = Date.now()) {
  const idk = key?.trim();
  if (!idk) return true;
  const prev = seenIdk.get(idk);
  if (prev && now - prev < IDK_TTL_MS) return false;
  seenIdk.set(idk, now);
  if (seenIdk.size > 2000) {
    for (const [k, at] of seenIdk) {
      if (now - at > IDK_TTL_MS) seenIdk.delete(k);
    }
  }
  return true;
}

export async function withProviderRetry<T>(name: string, fn: () => Promise<T>, tries = 2): Promise<T> {
  circuitAllow(name);
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const out = await fn();
      circuitOk(name);
      return out;
    } catch (err) {
      last = err;
      circuitFail(name, err);
      if (!isTransientProviderError(err) || i === tries - 1) throw err;
      await new Promise((r) => setTimeout(r, 350 * (i + 1)));
      if (circuitOpen(name)) throw err;
    }
  }
  throw last instanceof Error ? last : new Error("İstek başarısız.");
}
