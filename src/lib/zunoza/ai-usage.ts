import { logUsageEvent } from "@/lib/zunoza/usage";
import { getSql } from "@/lib/db";
import { estimateProviderUsd } from "@/lib/zunoza/provider-cost";
import { writeCostLedger } from "@/lib/zunoza/cost-ledger";
import { isUnlimitedUser } from "@/lib/zunoza/owner";
import type { XaiCostSource } from "@/lib/zunoza/xai-usage";

/** Internal millicents estimates. Never shown to users. Does not change credit prices. */
const MODEL_MILLI: Record<string, number> = {
  "grok-4-fast-non-reasoning": 80,
  "grok-3-mini": 60,
  "grok-4": 250,
  "grok-3": 180,
  "grok-voice-latest": 200,
  "grok-imagine-image-2.0": 400,
  "grok-imagine-image": 350,
  "grok-imagine-video-1.5": 1200,
  "eleven-music": 900,
  "elevenlabs-music": 900,
};

const KIND_MILLI: Record<string, number> = {
  assistant_chat: 80,
  assistant_web: 120,
  voice_live: 200,
  voice_tts: 200,
  image_generate: 400,
  image_edit: 400,
  video_generate: 1200,
  music_generate: 900,
  music_lyrics: 80,
  builder_create: 250,
  builder_edit: 180,
};

const RATE_LIMIT_MSG = "Çok hızlı istek. Lütfen biraz bekleyin.";

export function estimateMilli(model: string | null, units: number, extraTokens = 0, kind?: string) {
  if (units <= 0) return 0;
  const per = (model && MODEL_MILLI[model]) || (kind && KIND_MILLI[kind]) || 100;
  const tokenPart = extraTokens > 0 ? Math.ceil((extraTokens / 1000) * per) : 0;
  return per * Math.max(1, units) + tokenPart;
}

export function publicAiError(message: string) {
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\bsk-[a-zA-Z0-9]{8,}/g, "[redacted]")
    .replace(/\bxai-[a-zA-Z0-9]{8,}/g, "[redacted]")
    .replace(/api[_-]?key\s*[:=]\s*\S+/gi, "api_key=[redacted]")
    .replace(
      /\b(ELEVENLABS_API_KEY|XAI_API_KEY|DATABASE_URL|IYZICO_[A-Z0-9_]+|R2_[A-Z0-9_]+|AWS_[A-Z0-9_]+|MEDIA_S3_[A-Z0-9_]+)\b/g,
      "[redacted]",
    )
    .replace(/https?:\/\/api\.x\.ai\S*/gi, "[redacted]")
    .replace(/\bGrok Imagine(?:\s*Video)?(?:\s*[\d.]+)?/gi, "video")
    .replace(/\bgrok-imagine[-\w.]*/gi, "video")
    .replace(/\b(xAI|X\.AI|Kling|Shotstack|ElevenLabs)\b/gi, "")
    .replace(/Video API\s+\d+\s*:?\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 280);
}

const buckets = new Map<string, { n: number; reset: number }>();

export async function assertAiRateLimit(userId: string, kind: string, max = 40, windowMs = 60_000) {
  try {
    const sql = await getSql();
    if (await isUnlimitedUser(sql, userId)) return;
  } catch {
    /* fall through to window */
  }
  const key = `${userId}:${kind}`;
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || now >= cur.reset) {
    buckets.set(key, { n: 1, reset: now + windowMs });
  } else {
    if (cur.n >= max) throw new Error(RATE_LIMIT_MSG);
    cur.n += 1;
  }
  await persistRateWindow(userId, kind, max, windowMs);
}

async function persistRateWindow(userId: string, kind: string, max: number, windowMs: number) {
  let n = 0;
  try {
    const sql = await getSql();
    const start = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();
    const rows = await sql<{ n: number }>`
      insert into rate_windows (user_id, kind, window_start, n)
      values (${userId}, ${kind}, ${start}::timestamptz, 1)
      on conflict (user_id, kind, window_start)
      do update set n = rate_windows.n + 1
      returning n
    `;
    n = Number(rows[0]?.n ?? 0);
  } catch {
    throw new Error(RATE_LIMIT_MSG);
  }
  if (n > max) throw new Error(RATE_LIMIT_MSG);
}

export async function logAiUsage(opts: {
  userId: string;
  kind: string;
  provider?: string;
  model?: string | null;
  units?: number;
  durationMs?: number;
  ttfbMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  idempotencyKey?: string;
  meta?: string;
  estimatedCostUsd?: number;
  actualCostUsd?: number | null;
  costInUsdTicks?: number | null;
  costSource?: XaiCostSource;
  status?: string;
  creditsCharged?: number;
  jobId?: string;
  durationSeconds?: number;
  resolution?: string;
  quality?: string;
  unlimited?: boolean;
}) {
  const units = opts.units ?? 1;
  const milli = estimateMilli(
    opts.model ?? null,
    units,
    (opts.inputTokens || 0) + (opts.outputTokens || 0),
    opts.kind,
  );
  const usd =
    opts.costSource === "xai_ticks" && opts.actualCostUsd != null && Number.isFinite(opts.actualCostUsd)
      ? opts.actualCostUsd
      : opts.estimatedCostUsd ??
        estimateProviderUsd({ kind: opts.kind, model: opts.model, units, meta: opts.meta });
  const source: XaiCostSource = opts.costSource === "xai_ticks" ? "xai_ticks" : "unverified";
  const meta = JSON.stringify({
    p: opts.provider || "xai",
    ms: opts.durationMs ?? null,
    ttfb: opts.ttfbMs ?? null,
    in: opts.inputTokens ?? null,
    out: opts.outputTokens ?? null,
    milli,
    usd,
    ticks: opts.costInUsdTicks ?? null,
    src: source,
    credits: opts.creditsCharged ?? null,
    idk: opts.idempotencyKey ?? null,
    note: (opts.meta || "").slice(0, 120),
  }).slice(0, 400);
  await logUsageEvent(opts.userId, opts.kind, opts.model ?? null, units, meta, opts.idempotencyKey, usd);
  void writeCostLedger({
    userId: opts.userId,
    jobId: opts.jobId ?? opts.idempotencyKey ?? null,
    feature: opts.kind,
    provider: opts.provider || "xai",
    model: opts.model ?? null,
    durationSeconds: opts.durationSeconds ?? null,
    resolution: opts.resolution ?? null,
    quality: opts.quality ?? null,
    apiRequestCount: units,
    inputTokens: opts.inputTokens ?? null,
    outputTokens: opts.outputTokens ?? null,
    providerCostUsd: usd,
    creditsCharged: opts.creditsCharged ?? 0,
    unlimited: opts.unlimited,
    costInUsdTicks: opts.costInUsdTicks ?? null,
    costSource: source,
    status: opts.status,
  });
}

export async function withBackoff<T>(fn: () => Promise<T>, tries = 2): Promise<T> {
  let last: unknown;
  for (l
... 