/**
 * List-price catalog for owner invoice protection.
 * Does not change package prices or credit amounts.
 *
 * Sources (not a live invoice):
 * - xAI Imagine/Voice/Tools: https://docs.x.ai/developers/pricing (page updated 2026-09-07)
 * - ElevenLabs Music API: https://elevenlabs.io/pricing/api ($0.15/min)
 * - Shotstack PAYG: https://shotstack.io/pricing/ ($0.30/min)
 * - USD/TRY snapshot: 48.62 (2026-09-13 close)
 *
 * grok-4-fast-non-reasoning / grok-3-mini / grok-4 are NOT on the current official
 * text table. Chat rows marked estimated use third-party aggregators / historical lists.
 */

export const PRICE_AS_OF = "2026-09-07";
export const USD_TRY_SNAPSHOT = 48.62;

export const VIDEO_USD_PER_SEC = {
  "480p": 0.08,
  "720p": 0.14,
  "1080p": 0.25,
} as const;

export const VIDEO_INPUT_IMAGE_USD = 0.01;

export const IMAGE_OUTPUT_USD = {
  "grok-imagine-image-2.0": { "1k": 0.04, "2k": 0.06, input: 0.01 },
  "grok-imagine-image": { "1k": 0.02, "2k": 0.02, input: 0.002 },
} as const;

export const ELEVEN_MUSIC_USD_PER_MIN = 0.15;
export const XAI_TTS_USD_PER_MILLION_CHARS = 15;
export const XAI_VOICE_USD_PER_MIN = 0.08;
export const WEB_SEARCH_USD_PER_CALL = 0.005;
export const SHOTSTACK_USD_PER_MIN = 0.3;

/** Current ZUNOZA video credit table (migrations/0031). Admin can override via pricing_rules. */
export const VIDEO_CREDIT_TABLE: Record<string, Record<string, number>> = {
  "5": { ekonomik: 3, standart: 5, hd: 6, ultra: 9 },
  "10": { ekonomik: 6, standart: 10, hd: 12, ultra: 18 },
  "15": { ekonomik: 9, standart: 15, hd: 17, ultra: 27 },
  "30": { ekonomik: 18, standart: 30, hd: 34, ultra: 54 },
};

export type CostQuality = "ekonomik" | "standart" | "hd" | "ultra";

export function qualityToResolution(quality: string, mode: "t2v" | "i2v" | "r2v" = "t2v") {
  const wanted = quality === "ekonomik" ? "480p" : quality === "ultra" ? "1080p" : "720p";
  if (mode === "r2v" && wanted === "1080p") return "720p" as const;
  return wanted as "480p" | "720p" | "1080p";
}

export function usdToTry(usd: number, rate = USD_TRY_SNAPSHOT) {
  return Math.round(usd * rate * 100) / 100;
}

export function estimateVideoUsd(opts: {
  durationSeconds: number;
  quality: string;
  imageInputs?: number;
  mode?: "t2v" | "i2v" | "r2v";
}) {
  const scenes = opts.durationSeconds >= 30 ? 2 : 1;
  const sceneDur = opts.durationSeconds >= 30 ? 15 : opts.durationSeconds <= 5 ? 5 : opts.durationSeconds <= 10 ? 10 : 15;
  const res = qualityToResolution(opts.quality, opts.mode);
  const perSec = VIDEO_USD_PER_SEC[res];
  const output = scenes * sceneDur * perSec;
  const input = (opts.imageInputs ?? 0) * VIDEO_INPUT_IMAGE_USD;
  return Math.round((output + input) * 1e6) / 1e6;
}

export function videoCreditsCharged(durationSeconds: number, quality: string) {
  const row = VIDEO_CREDIT_TABLE[String(durationSeconds)] || VIDEO_CREDIT_TABLE["15"];
  return row?.[quality] ?? durationSeconds;
}

export function estimateImageUsd(model: string | null, n: number, resolution: "1k" | "2k" = "1k", inputImages = 0) {
  const row =
    model && model in IMAGE_OUTPUT_USD
      ? IMAGE_OUTPUT_USD[model as keyof typeof IMAGE_OUTPUT_USD]
      : IMAGE_OUTPUT_USD["grok-imagine-image-2.0"];
  const count = Math.max(1, n);
  return Math.round((row[resolution] * count + row.input * inputImages) * 1e6) / 1e6;
}

export function estimateMusicUsd(durationSeconds: number) {
  return Math.round((ELEVEN_MUSIC_USD_PER_MIN * Math.max(1, durationSeconds) / 60) * 1e6) / 1e6;
}

export function estimateTtsUsd(chars: number) {
  return Math.round((XAI_TTS_USD_PER_MILLION_CHARS * Math.max(0, chars) / 1_000_000) * 1e6) / 1e6;
}

export function estimateVoiceLiveUsd(minutes: number) {
  return Math.round(XAI_VOICE_USD_PER_MIN * Math.max(1, minutes) * 1e6) / 1e6;
}

export function estimateMontageUsd(durationSeconds: number) {
  return Math.round((SHOTSTACK_USD_PER_MIN * Math.max(1, durationSeconds) / 60) * 1e6) / 1e6;
}

/** Chat is estimated: ZUNOZA models are not on the 2026-09-07 official text table. */
export function estimateChatUsd(kind: string, inputTokens = 800, outputTokens = 400
... 