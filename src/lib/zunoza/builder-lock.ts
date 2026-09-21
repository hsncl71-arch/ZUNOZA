export const BUILDER_LOCK_MS = 180_000;
export const BUILDER_STALE_MS = 210_000;

export function builderLockHeld(job: { locked_until?: unknown }, now = Date.now()) {
  const lockedUntil = job.locked_until ? new Date(String(job.locked_until)).getTime() : 0;
  return Number.isFinite(lockedUntil) && lockedUntil > now;
}

/** Only recover a generating job after lock AND last heartbeat are both stale — never mid-xAI. */
export function shouldResetStaleGenerating(
  job: { status?: unknown; locked_until?: unknown; updated_at?: unknown },
  now = Date.now(),
) {
  if (String(job.status) !== "generating") return false;
  if (builderLockHeld(job, now)) return false;
  const updated = job.updated_at ? new Date(String(job.updated_at)).getTime() : 0;
  if (!Number.isFinite(updated) || updated <= 0) return true;
  return now - updated >= BUILDER_STALE_MS;
}
