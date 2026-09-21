import { getSql } from "@/lib/db";
import { USD_TRY_SNAPSHOT, spendWouldBlock } from "@/lib/zunoza/provider-cost";
import { USER_DAILY_COST_USD_DEFAULT } from "@/lib/zunoza/credit-economy";

const DAILY_MSG = "Günlük yapay zekâ bütçesi doldu. Yeni ücretli üretim durdu. Yönetici Maliyet sekmesinden limiti yükseltebilir.";
const MONTHLY_MSG = "Aylık yapay zekâ bütçesi doldu. Yeni ücretli üretim durdu. Yönetici Maliyet sekmesinden limiti yükseltebilir.";
const USER_MSG = "Günlük kişisel üretim bütçeniz doldu. Yarın tekrar deneyin.";
const PROVIDER_MSG = "Bu sağlayıcı için günlük maliyet limiti doldu. Biraz sonra tekrar deneyin.";

export type CostCapSettings = {
  enabled: boolean;
  dailyUsd: number;
  monthlyUsd: number;
  usdTryRate: number;
  userDailyUsd: number;
  providerVideoUsd: number;
  providerImageUsd: number;
  providerMusicUsd: number;
  providerOtherUsd: number;
};

export const DEFAULT_COST_CAPS: CostCapSettings = {
  enabled: true,
  dailyUsd: 50,
  monthlyUsd: 400,
  usdTryRate: USD_TRY_SNAPSHOT,
  userDailyUsd: USER_DAILY_COST_USD_DEFAULT,
  providerVideoUsd: 40,
  providerImageUsd: 15,
  providerMusicUsd: 10,
  providerOtherUsd: 15,
};

function num(value: string | null | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function readCostCapSettings(): Promise<CostCapSettings> {
  try {
    const sql = await getSql();
    const rows = await sql<{ key: string; value: string }>`
      select key, value from app_settings
      where key in (
        'cost_cap_enabled', 'cost_cap_daily_usd', 'cost_cap_monthly_usd', 'usd_try_rate',
        'user_daily_cost_usd', 'provider_cap_video_usd', 'provider_cap_image_usd',
        'provider_cap_music_usd', 'provider_cap_other_usd'
      )
    `;
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      enabled: (map.cost_cap_enabled ?? "true") !== "false",
      dailyUsd: num(map.cost_cap_daily_usd, DEFAULT_COST_CAPS.dailyUsd),
      monthlyUsd: num(map.cost_cap_monthly_usd, DEFAULT_COST_CAPS.monthlyUsd),
      usdTryRate: num(map.usd_try_rate, DEFAULT_COST_CAPS.usdTryRate),
      userDailyUsd: num(map.user_daily_cost_usd, DEFAULT_COST_CAPS.userDailyUsd),
      providerVideoUsd: num(map.provider_cap_video_usd, DEFAULT_COST_CAPS.providerVideoUsd),
      providerImageUsd: num(map.provider_cap_image_usd, DEFAULT_COST_CAPS.providerImageUsd),
      providerMusicUsd: num(map.provider_cap_music_usd, DEFAULT_COST_CAPS.providerMusicUsd),
      providerOtherUsd: num(map.provider_cap_other_usd, DEFAULT_COST_CAPS.providerOtherUsd),
    };
  } catch {
    return DEFAULT_COST_CAPS;
  }
}

export async function readSpendUsd() {
  const sql = await getSql();
  const [day] = await sql<{ n: string | number }>`
    select coalesce(sum(estimated_cost_usd), 0) as n
    from usage_events
    where created_at >= date_trunc('day', now())
      and estimated_cost_usd is not null
  `;
  const [month] = await sql<{ n: string | number }>`
    select coalesce(sum(estimated_cost_usd), 0) as n
    from usage_events
    where created_at >= date_trunc('month', now())
      and estimated_cost_usd is not null
  `;
  return {
    dayUsd: Number(day?.n ?? 0) || 0,
    monthUsd: Number(month?.n ?? 0) || 0,
  };
}

function providerBucket(kind: string) {
  if (kind.startsWith("video")) return "video" as const;
  if (kind.startsWith("image")) return "image" as const;
  if (kind.startsWith("music") || kind.startsWith("voice_song")) return "music" as const;
  return "other" as const;
}

export async function assertSpendCap(thisCallUsd = 0, ctx?: { userId?: string; kind?: string }) {
  const settings = await readCostCapSettings();
  if (!settings.enabled) return;
  let spend = { dayUsd: 0, monthUsd: 0 };
  try {
    spend = await readSpendUsd();
  } catch {
    throw new Error(DAILY_MSG);
  }
  const hit = spendWouldBlock(
    spend.dayUsd,
    spend.monthUsd,
    thisCallUsd,
    settings.dailyUsd,
    settings.monthlyUsd,
... 