/** Client-safe montage helpers. No Node APIs. */

export const MONTAGE_MAX_CLIPS = 40;
export const MONTAGE_MAX_CLIP_SECONDS = 180;
export const MONTAGE_MAX_TIMELINE_SECONDS = 600;
export const MONTAGE_STALE_MS = 15 * 60 * 1000;

export type MontagePlanClip = {
  id: string;
  kind: "video" | "image";
  assetId: string;
  label: string;
  duration: number;
  trimStart?: number;
  volume?: number;
  transition?: "cut" | "fade";
};

export function clampMontageDuration(value: unknown, max = MONTAGE_MAX_CLIP_SECONDS) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(max, Math.round(n * 10) / 10));
}

export function clampTrimStart(value: unknown, sourceMax = MONTAGE_MAX_CLIP_SECONDS) {
  const cap = Math.max(1, sourceMax);
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(0, Math.min(Math.max(0, cap - 1), Math.round(n * 10) / 10));
}

export function clipPlayLength(
  clip: { duration?: number; trimStart?: number },
  sourceMax?: number,
) {
  const start = Math.max(0, Number(clip.trimStart) || 0);
  const duration = clampMontageDuration(clip.duration);
  if (!sourceMax || sourceMax <= 0) return duration;
  return Math.max(1, Math.min(duration, Math.max(1, sourceMax - start)));
}

export function clipEndSeconds(clip: { duration?: number; trimStart?: number }) {
  return Math.max(0, Number(clip.trimStart) || 0) + clampMontageDuration(clip.duration);
}

export function timelineSeconds(clips: Array<{ duration?: number }>) {
  return clips.reduce((sum, clip) => sum + clampMontageDuration(clip.duration), 0);
}

export function remainingTimelineSeconds(clips: Array<{ duration?: number }>) {
  return Math.max(0, MONTAGE_MAX_TIMELINE_SECONDS - timelineSeconds(clips));
}

export function duplicateMontageClip<T extends MontagePlanClip>(clip: T): T {
  return { ...clip, id: crypto.randomUUID() };
}

export function normalizeMontageClip(raw: Record<string, unknown>): MontagePlanClip | null {
  const kind = raw.kind === "image" ? "image" : raw.kind === "video" ? "video" : null;
  const id = String(raw.id ?? "").trim();
  const assetId = String(raw.assetId ?? "").trim();
  if (!kind || !id || !assetId) return null;
  return {
    id,
    kind,
    assetId,
    label: String(raw.label ?? "Klip").slice(0, 80),
    duration: clampMontageDuration(raw.duration),
    trimStart: clampTrimStart(raw.trimStart),
    volume: Math.min(1, Math.max(0, Number(raw.volume ?? 1))),
    transition: raw.transition === "fade" ? "fade" : "cut",
  };
}

export function reorderClips<T>(clips: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= clips.length || to >= clips.length) return clips;
  const next = clips.slice();
  const [item] = next.splice(from, 1);
  if (!item) return clips;
  next.splice(to, 0, item);
  return next;
}

export function splitMontageClip<T extends MontagePlanClip>(clip: T): [T, T] | null {
  if (clip.duration < 2) return null;
  const left = Math.max(1, Math.floor(clip.duration / 2));
  const right = Math.max(1, clip.duration - left);
  return [
    { ...clip, duration: left },
    {
      ...clip,
      id: crypto.randomUUID(),
      duration: right,
      trimStart: (clip.trimStart ?? 0) + left,
    },
  ];
}

export function quoteMontageCredits(durationSeconds: number, per15s: number) {
  const blocks = Math.max(1, Math.ceil(Math.max(1, durationSeconds) / 15));
  return blocks * Math.max(0, Math.trunc(per15s));
}

export function montageQuoteLabel(opts: {
  quoteReady: boolean;
  quoteError: boolean;
  unlimited: boolean;
  credits: number;
  duration: number;
  balance?: number;
}) {
  if (opts.quoteError) return "Kredi hesaplanamadı. Bağlantınızı kontrol edip tekrar deneyin.";
  if (!opts.quoteReady) return "Kredi hesaplanıyor…";
  if (opts.unlimited) return "Sahip hesabı: bu render kredi düşmez.";
  if (opts.credits <= 0) return `Birleşik video ${opts.duration} sn.`;
  const core = `Birleşik video ${opts.duration} sn · ${opts.credits} kredi.`;
  if (typeof opts.balance === "number") return `${core} Paketinizde ${opts.balance} kredi kaldı.`;
  return core;
}

export function montageProgressCopy(status: string, updatedAt: string, now = Date.now()) {
  const parsed = Date.parse(updatedAt);
  const elapsedMs = Number.isFinite(parsed) ? Math.max(0, now - parsed) : 0;
  const secs = Math.floor(elapsedMs / 1000);
  const mm = String(Math.floor(secs / 60));
  const ss = String(secs % 60).padStart(2, "0");
  const running = status === "render_ediliyor";
  let hint = "K
... 