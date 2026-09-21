/** İnşa Et agent hard caps. Prevents runaway loops and uncontrolled xAI spend. */

export const BUILDER_JOB_DEADLINE_MS = 8 * 60_000;
export const BUILDER_MAX_API_CALLS = 8;
export const BUILDER_MAX_TICKS = 24;
export const BUILDER_MAX_RETRY = 3;
export const BUILDER_USER_CONCURRENT = 1;
export const BUILDER_QUEUE_MAX = 16;
export const BUILDER_KICK_STEPS = 6;

export type BuilderStatus =
  | "analyzing"
  | "planning"
  | "generating"
  | "assembling"
  | "checking"
  | "testing"
  | "repairing"
  | "building"
  | "previewing"
  | "completed"
  | "failed";

export function jobExceededDeadline(job: { created_at?: unknown }, now = Date.now()) {
  const created = job.created_at ? new Date(String(job.created_at)).getTime() : 0;
  if (!Number.isFinite(created) || created <= 0) return false;
  return now - created >= BUILDER_JOB_DEADLINE_MS;
}

export function jobExceededCaps(job: {
  api_calls?: unknown;
  tick_count?: unknown;
  retry_count?: unknown;
}) {
  const api = Number(job.api_calls || 0);
  const ticks = Number(job.tick_count || 0);
  const retries = Number(job.retry_count || 0);
  return (
    (Number.isFinite(api) && api >= BUILDER_MAX_API_CALLS) ||
    (Number.isFinite(ticks) && ticks >= BUILDER_MAX_TICKS) ||
    (Number.isFinite(retries) && retries > BUILDER_MAX_RETRY)
  );
}

export function builderJobKindLabel(kind: string, status: string) {
  if (status === "failed") return "Başarısız";
  if (status === "completed") return "Tamamlandı";
  if (kind === "edit") return "Düzenleme";
  if (kind === "repair" || kind === "retry" || status === "repairing") return "Onarım";
  return "Oluşturma";
}

export const BUILDER_STEPS = [
  "analyzing",
  "planning",
  "generating",
  "assembling",
  "checking",
  "testing",
  "repairing",
  "building",
  "previewing",
  "completed",
] as const;

export const BUILDER_WORK_STEPS = [
  { id: "analyzing", label: "İstek analiz ediliyor" },
  { id: "planning", label: "Uygulama mimarisi hazırlanıyor" },
  { id: "generating", label: "Dosyalar oluşturuluyor" },
  { id: "assembling", label: "Arayüz hazırlanıyor" },
  { id: "checking", label: "Güvenlik kontrol ediliyor" },
  { id: "testing", label: "Testler çalıştırılıyor" },
  { id: "repairing", label: "Hatalar tespit edildi, düzeltiliyor" },
  { id: "building", label: "Bağımlılıklar kontrol ediliyor" },
  { id: "previewing", label: "Önizleme hazırlanıyor" },
] as const;

export function builderStepIndex(step: string | null | undefined) {
  const i = BUILDER_STEPS.indexOf(step as (typeof BUILDER_STEPS)[number]);
  return i < 0 ? 0 : i;
}

export function builderWorkStepIndex(step: string | null | undefined) {
  const i = BUILDER_WORK_STEPS.findIndex((item) => item.id === step);
  return i < 0 ? 0 : i;
}

export function builderStepTone(
  current: string | null | undefined,
  itemId: string,
  extra?: { retries?: number; failedStep?: string | null },
): "wait" | "run" | "done" | "err" {
  const order = BUILDER_WORK_STEPS.map((item) => item.id) as readonly string[];
  const retries = Number(extra?.retries || 0);
  if (current === "completed") return "done";
  if (current === "failed") {
    const failed = extra?.failedStep && order.includes(extra.failedStep) ? extra.failedStep : "previewing";
    if (itemId === failed) return "err";
    const at = order.indexOf(itemId);
    const failAt = order.indexOf(failed);
    if (at >= 0 && failAt >= 0 && at < failAt) return "done";
    return "wait";
  }
  if (itemId === "repairing") {
    if (current === "repairing") return "run";
    if (retries > 0) return "done";
    return "wait";
  }
  if (current === "repairing") {
    if (itemId === "generating" || itemId === "assembling" || itemId === "checking" || itemId === "testing") {
      return "done";
    }
    const at = order.indexOf(itemId);
    const gen = order.indexOf("generating");
    return at >= 0 && at < gen ? "done" : "wait";
  }
  const now = order.indexOf(String(current || ""));
  const at = order.indexOf(itemId);
  if (now < 0) return at === 0 ? "run" : "wait";
  if (at < now) return "done";
  if (at === now) return "run";
  return "wait";
}

export function publicBui
... 