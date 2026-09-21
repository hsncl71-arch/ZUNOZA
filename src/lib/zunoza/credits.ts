import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { isUnlimitedUser } from "@/lib/zunoza/owner";
import {
  DEFAULT_ECONOMY,
  DEFAULT_FEATURE_CREDITS,
  DEFAULT_VIDEO_CREDIT_TABLE,
  FREE_DAILY_GENERATIONS,
  FREE_MAX_VIDEO_SECONDS,
  IYZICO_ASSUMPTION_LABEL,
  IYZICO_ASSUMPTION_PCT,
  WELCOME_CREDITS_DEFAULT,
  catalogSnapshot,
  computeVideoCreditTable,
  formulaVideoCredits,
  imageCredits,
  montageCredits,
  musicCredits,
  type EconomySettings,
  type Quality,
  voiceSongCredits,
  ttsCredits,
  computeFeatureCredits,
} from "@/lib/zunoza/credit-economy";
import { writeCostLedger, type CostLedgerRow } from "@/lib/zunoza/cost-ledger";

const INSUFFICIENT = "Bu işlem için yeterli krediniz bulunmuyor.";
const DUP_MSG = "Aynı istek zaten işleniyor. Lütfen birkaç saniye bekleyin.";
const FREE_ULTRA = "Ücretsiz hesapta Ultra kapalı. Paket alarak 1080p üretebilirsiniz.";
const FREE_DURATION = "Ücretsiz hesapta video süresi en fazla 10 saniye.";
const FREE_DAILY = "Ücretsiz hesap günlük üretim limitine ulaştı. Yarın tekrar deneyin veya paket alın.";
const FREE_VOICE = "Ses klonlama ücretli paket gerektirir.";
const CONCURRENCY_MSG = "Aynı anda en fazla 2 video üretimi çalışabilir.";

const recent = new Map<string, number>();
const inflight = new Map<string, number>();

function numSetting(map: Record<string, string>, key: string, fallback: number) {
  const n = Number(map[key]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function readEconomySettings(): Promise<EconomySettings> {
  try {
    const sql = await getSql();
    const rows = await sql<{ key: string; value: string }>`
      select key, value from app_settings
      where key in (
        'usd_try_rate','iyzico_assumption_pct','safety_margin_pct','credit_per_usd',
        'video_coef_hd','welcome_credits','free_max_video_seconds','free_allow_ultra',
        'free_daily_generations','user_daily_cost_usd',
        'video_usd_480p','video_usd_720p','video_usd_1080p','video_input_image_usd'
      )
    `;
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      usdTryRate: numSetting(map, "usd_try_rate", DEFAULT_ECONOMY.usdTryRate),
      iyzicoAssumptionPct: numSetting(map, "iyzico_assumption_pct", DEFAULT_ECONOMY.iyzicoAssumptionPct),
      safetyMarginPct: numSetting(map, "safety_margin_pct", DEFAULT_ECONOMY.safetyMarginPct),
      creditPerUsd: numSetting(map, "credit_per_usd", DEFAULT_ECONOMY.creditPerUsd),
      hdQualityCoef: numSetting(map, "video_coef_hd", DEFAULT_ECONOMY.hdQualityCoef),
      welcomeCredits: Math.trunc(numSetting(map, "welcome_credits", DEFAULT_ECONOMY.welcomeCredits)),
      freeMaxVideoSeconds: Math.trunc(numSetting(map, "free_max_video_seconds", DEFAULT_ECONOMY.freeMaxVideoSeconds)),
      freeAllowUltra: (map.free_allow_ultra ?? "false") === "true",
      freeDailyGenerations: Math.trunc(numSetting(map, "free_daily_generations", DEFAULT_ECONOMY.freeDailyGenerations)),
      userDailyCostUsd: numSetting(map, "user_daily_cost_usd", DEFAULT_ECONOMY.userDailyCostUsd),
      videoUsd480: numSetting(map, "video_usd_480p", DEFAULT_ECONOMY.videoUsd480),
      videoUsd720: numSetting(map, "video_usd_720p", DEFAULT_ECONOMY.videoUsd720),
      videoUsd1080: numSetting(map, "video_usd_1080p", DEFAULT_ECONOMY.videoUsd1080),
      videoInputImageUsd: numSetting(map, "video_input_image_usd", DEFAULT_ECONOMY.videoInputImageUsd),
    };
  } catch {
    return DEFAULT_ECONOMY;
  }
}

export async function persistVideoPricing(settings: EconomySettings) {
  const table = computeVideoCreditTable(settings);
  const sql = await getSql();
  for (const duration of [5, 10, 15, 30]) {
    const row = table[String(duration)];
    if (!row) continue;
    for (const quality of ["ekonomik", "standart", "hd", "ultra"] as Quality[]) {
      const credits = row[quality];
      await sql`
        insert into pricing_rules (duration_seconds, quality, credits)
        values (${duration}, ${quality}, ${credits})
        on conflict (duration_seconds, quality) do update set credits = ${credits}
      `;
    }
  }
  return table;
}

export async function persistFeaturePricing(settings: EconomySettings) {
  const features = computeFeatureCredits(settings);
  const sql = await getSql();
  for (const [feature, credits] of Object.entries(features)) {
    await sql`
      insert into feature_credit_rules (feature, credits, updated_at)
      values (${feature}, ${credits}, now())
      on conflict (feature) do update set credits = ${credits}, updated_at = now()
    `;
  }
  return features;
}

export async function readFeatureCreditMap() {
  const map: Record<string, number> = { ...DEFAULT_FEATURE_CREDITS };
  try {
    const sql = await getSql();
    const rows = await sql<{ feature: string; credits: number }>`
      select feature, credits from feature_credit_rules
    `;
    for (const row of rows) {
      if (Number.isFinite(row.credits) && row.credits >= 0) map[row.feature] = Math.trunc(row.credits);
    }
  } catch {
    /* table may lag a deploy */
  }
  return map;
}

export async function videoCreditsF
... 