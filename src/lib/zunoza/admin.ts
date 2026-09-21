import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { dbSource, getSql } from "@/lib/db";
import { isOwnerEmail, isOwnerUser, requireAdmin, requireOwner, OWNER_EMAIL } from "@/lib/zunoza/owner";
import { r2Configured } from "@/lib/zunoza/r2";
import { shotstackProductionReady, shotstackReady } from "@/lib/zunoza/montage";
import { maskEmail } from "@/lib/zunoza/privacy-mask";
import { eraseUserData } from "@/lib/zunoza/privacy";
import { DEFAULT_LIVE_VOICE, LIVE_VOICES, resolveLiveVoice, type LiveVoiceId } from "@/lib/zunoza/voices";
import { DEFAULT_FOUNDER_PROFILE, parseFounderProfile, type FounderProfile } from "@/lib/zunoza/brand";
import { assertAiRateLimit, estimateMilli, kindCostLabel } from "@/lib/zunoza/ai-usage";
import { circuitOpen } from "@/lib/zunoza/resilience";
import { readCostCapSettings, readSpendUsd } from "@/lib/zunoza/cost-cap";
import { persistVideoPricing, persistFeaturePricing, readEconomySettings } from "@/lib/zunoza/credits";
import {
  IYZICO_ASSUMPTION_LABEL,
  IYZICO_ASSUMPTION_PCT,
  DEFAULT_FEATURE_CREDITS,
  DEFAULT_PACKAGES,
  DEFAULT_VIDEO_CREDIT_TABLE,
  stressAllPackages,
  stressPackage,
  lossWarning,
  freeUserMaxCostTry,
  type Quality,
} from "@/lib/zunoza/credit-economy";
import { costAuditSnapshot } from "@/lib/zunoza/cost-audit";

const STUDIOS = ["video", "gorsel", "muzik", "tts", "klip", "montaj"] as const;

async function writeAudit(
  sql: Awaited<ReturnType<typeof getSql>>,
  adminId: string,
  action: string,
  targetUserId: string | null,
  detail: string,
) {
  await sql`
    insert into admin_audit_log (id, admin_id, action, target_user_id, detail)
    values (${crypto.randomUUID()}, ${adminId}, ${action}, ${targetUserId}, ${detail.slice(0, 500)})
  `;
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    const [row] = await sql<{
      users: number;
      videos: number;
      images: number;
      music: number;
      tts: number;
      montages: number;
      credits_used: number;
      credits_granted: number;
      tickets: number;
    }>`
      select
        (select count(*)::int from zunoza_profiles) as users,
        (select count(*)::int from video_jobs) as videos,
        (select count(*)::int from image_assets) as images,
        (select count(*)::int from music_assets) as music,
        (select count(*)::int from voice_assets) as tts,
        (select count(*)::int from montage_projects) as montages,
        (select coalesce(sum(case when amount < 0 then -amount else 0 end), 0)::int from credit_ledger) as credits_used,
        (select coalesce(sum(case when amount > 0 then amount else 0 end), 0)::int from credit_ledger) as credits_granted,
        (select count(*)::int from support_tickets) as tickets
    `;
    return {
      users: row?.users ?? 0,
      videos: row?.videos ?? 0,
      images: row?.images ?? 0,
      music: row?.music ?? 0,
      tts: row?.tts ?? 0,
      montages: row?.montages ?? 0,
      creditsUsed: row?.credits_used ?? 0,
      creditsGranted: row?.credits_granted ?? 0,
      tickets: row?.tickets ?? 0,
    };
  });

export const getAdminServices = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    const { iyzicoConfigured } = await import("@/lib/zunoza/iyzico.server");
    const xai = Boolean(process.env.XAI_API_KEY?.trim());
    const eleven = Boolean(
      process.env.ELEVENLABS_API_KEY?.trim() || process.env.ELEVEN_API_KEY?.trim(),
    );
    return {
      video: xai,
      gorsel: xai,
      tts: xai,
      muzik: eleven,
      r2: r2Configured(),
      shotstack: shotstackReady(),
      shotstackProd: shotstackProductionReady(),
      iyzico: iyzicoConfigured(),
      neon: dbSource === "neon",
      xaiCircuitOpen: circuitOpen("xai"),
    };
  });

export const getActualCostCenter = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    const empty = {
      hasActual: false,
      message: "GERÇEK VERİ YETERSİZ",
      windows: [] as Array<{
        label: string;
        actualUsd: number;
        unverifiedUsd: number;
        byProvider: Array<{ provider: string; actualUsd: number }>;
        byFeature: Array<{ feature: string; actualUsd: number }>;
        heavyUsers: Array<{ userId: string; actualUsd: number }>;
      }>,
    };
    try {
      const windows = [
        { label: "BUGÜN", sql: `created_at >= date_trunc('day', now())` },
        { label: "SON 7 GÜN", sql: `created_at >= now() - interval '7 days'` },
        { label: "BU AY", sql: `created_at >= date_trunc('month', now())` },
        { label: "TÜM ZAMANLAR", sql: `true` },
      ];
      const out = [];
      let hasActual = false;
      for (const w of windows) {
        const [sum] = await sql.query<{ actual: number; unverified: number }>(
          `select
             coalesce(sum(case when cost_source = 'xai_ticks' then provider_cost_usd else 0 end), 0)::float as actual,
             coalesce(sum(case when cost_source is distinct from 'xai_ticks' then provider_cost_usd else 0 end), 0)::float as unverified
           from cost_ledger where ${w.sql}`,
        );
        const byProvider = await sql.query<{ provider: string; actualUsd: number }>(
          `select coalesce(provider, 'bilinmiyor') as provider,
                  coalesce(sum(provider_cost_usd), 0)::float as "actualUsd"
           from cost_ledger
           where ${w.sql} and cost_source = 'xai_ticks'
           group by 1 order by 2 desc limit 12`,
        );
        const byFeature = await sql.query<{ feature: string; actualUsd: number }>(
          `select feature, coalesce(sum(provider_cost_usd), 0)::float as "actualUsd"
           from cost_ledger
           where ${w.sql} and cost_source = 'xai_ticks'
           group by 1 order by 2 desc limit 12`,
        );
        const heavyUsers = await sql.query<{ userId: string; actualUsd: number }>(
          `select user_id as "userId", coalesce(sum(provider_cost_usd), 0)::float as "actualUsd"
           from cost_ledger
           where ${w.sql} and cost_source = 'xai_ticks'
           group by 1 order by 2 desc limit 8`,
        );
        const actualUsd = Number(sum?.actual ?? 0) || 0;
        if (actualUsd > 0) hasActual = true;
        out.push({
          label: w.label,
          actualUsd,
          unverifiedUsd: Number(sum?.unverified ?? 0) || 0,
          byProvider,
          byFeature,
          heavyUsers,
        });
      }
      return { hasActual, message: hasActual ? "xAI ticks" : "GERÇEK VERİ YETERSİZ", windows: out };
    } catch {
      return empty;
    }
  });

export const getAdminUsage = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const empty = {
      windowDays: 30,
      totalEvents: 0,
      errors: 0,
      errorRate: 0,
      totalMilli: 0,
      totalUsd: 0,
      dayUsd: 0,
      monthUsd: 0,
      items: [] as Array<{
        kind: string;
        label: string;
        model: string | null;
        events: number;
        units: number;
        milli: number;
        usd: number;
      }>,
      topUsers: [] as Array<{ userId: string; email: string; events: number; usd: number }>,
      estimated: true,
    };
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    try {
      let rows: { kind: string; model: string | null; n: number; units: number; usd: number }[] = [];
      try {
        rows = await sql<{ kind: string; model: string | null; n: number; units: number; usd: number }>`
          select kind, model, count(*)::int as n, coalesce(sum(units), 0)::int as units,
                 coalesce(sum(estimated_cost_usd), 0)::float as usd
          from usage_events
          where created_at > now() - interval '30 days'
          group by kind, model
        `;
      } catch {
        const old = await sql<{ kind: string; model: string | null; n: number; units: number }>`
          select kind, model, count(*)::int as n, coalesce(sum(units), 0)::int as units
          from usage_events
          where created_at > now() - interval '30 days'
          group by kind, model
        `;
        rows = old.map((row) => ({ ...row, usd: 0 }));
      }
      const items = rows
        .filter((row) => !/_error$|_delete$/.test(row.kind))
        .map((row) => ({
          kind: row.kind,
          label: kindCostLabel(row.kind),
          model: row.model,
          events: row.n,
          units: row.units,
          milli: estimateMilli(row.model, row.units, 0, row.kind),
          usd: Math.round(Number(row.usd || 0) * 1e6) / 1e6,
        }));
      const errors = rows.filter((row) => /_error$/.test(row.kind)).reduce((s, row) => s + row.n, 0);
      const totalEvents = rows.reduce((s, row) => s + row.n, 0);
      const totalMilli = items.reduce((s, row) => s + row.milli, 0);
      const totalUsd = items.reduce((s, row) => s + row.usd, 0);
      items.sort((a, b) => b.usd - a.usd || b.milli - a.milli);
      let topUsers: Array<{ userId: string; email: string; events: number; usd: number }> = [];
      try {
        const users = await sql<{ user_id: string; email: string | null; n: number; usd: number }>`
          select e.user_id, p.email, count(*)::int as n, coalesce(sum(e.estimated_cost_usd), 0)::float as usd
          from usage_events e
          left join zunoza_profiles p on p.user_id = e.user_id
          where e.created_at > now() - interval '30 days'
            and e.estimated_cost_usd is not null
          group by e.user_id, p.email
          order by usd desc
          limit 8
        `;
        topUsers = users.map((u) => ({
          userId: u.user_id,
          email: maskEmail(u.email),
          events: u.n,
          usd: Math.round(Number(u.usd || 0) * 1e6) / 1e6,
        }));
      } catch {
        topUsers = [];
      }
      const spend = await readSpendUsd().catch(() => ({ dayUsd: 0, monthUsd: 0 }));
      return {
        windowDays: 30,
        totalEvents,
        errors,
        errorRate: totalEvents ? Math.round((errors / totalEvents) * 1000) / 10 : 0,
        totalMilli,
        totalUsd: Math.round(totalUsd * 1e6) / 1e6,
        dayUsd: spend.dayUsd,
        monthUsd: spend.monthUsd,
        items: items.slice(0, 12),
        topUsers,
        estimated: true,
      };
    } catch {
      return empty;
    }
  });

export const getCostCaps = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    const settings = await readCostCapSettings();
    const spend = await readSpendUsd().catch(() => ({ dayUsd: 0, monthUsd: 0 }));
    
... 
export const listAdminUsers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { query?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    const owner = await isOwnerUser(sql, context.userId);
    const q = `%${(data.query ?? "").trim().toLowerCase()}%`;
    const rows = await sql.query<{
      user_id: string;
      display_name: string | null;
      email: string | null;
      is_admin: boolean;
      is_active: boolean;
      blocked: boolean;
      package_id: string | null;
      daily_limit: number | null;
      created_at: string;
      balance: number | null;
    }>(
      `select p.user_id, p.display_name, p.email, p.is_admin, p.is_active, p.blocked,
              p.package_id, p.daily_limit, p.created_at, coalesce(w.balance, 0) as balance
       from zunoza_profiles p
       left join credit_wallets w on w.user_id = p.user_id
       where $1 = '%%'
          or lower(coalesce(p.email, '')) like $1
          or lower(coalesce(p.display_name, '')) like $1
          or lower(p.user_id) like $1
       order by p.created_at desc
       limit 80`,
      [q],
    );
    retur
... 