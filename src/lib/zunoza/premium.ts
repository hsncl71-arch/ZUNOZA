import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { requireAdmin } from "@/lib/zunoza/owner";

export type PremiumPlan = {
  id: string;
  name: string;
  priceTry: number;
  periodLabel: string;
  durationDays: number;
  credits: number;
  badge: string;
  description: string;
  features: string[];
  introPriceTry: number | null;
  introNote: string;
  active: boolean;
  sortOrder: number;
};

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function splitFeatures(raw: string | null | undefined) {
  return String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function mapPlan(row: Record<string, unknown>): PremiumPlan {
  return {
    id: String(row.id),
    name: String(row.name),
    priceTry: num(row.price_try),
    periodLabel: String(row.period_label || ""),
    durationDays: Math.trunc(num(row.duration_days)),
    credits: Math.trunc(num(row.credits)),
    badge: String(row.badge || ""),
    description: String(row.description || ""),
    features: splitFeatures(row.features as string),
    introPriceTry: row.intro_price_try == null || row.intro_price_try === "" ? null : num(row.intro_price_try),
    introNote: String(row.intro_note || ""),
    active: Boolean(row.active),
    sortOrder: Math.trunc(num(row.sort_order)),
  };
}

export const listPremiumPlans = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    select id, name, price_try, period_label, duration_days, credits, badge, description, features,
           intro_price_try, intro_note, active, sort_order
    from premium_plans
    where active = true
    order by sort_order, name
  `;
  return rows.map(mapPlan);
});

export const listAdminPremiumPlans = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    const rows = await sql<Record<string, unknown>>`
      select id, name, price_try, period_label, duration_days, credits, badge, description, features,
             intro_price_try, intro_note, active, sort_order
      from premium_plans
      order by sort_order, name
    `;
    return rows.map(mapPlan);
  });

export const updatePremiumPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      id: string;
      name: string;
      priceTry: number;
      periodLabel: string;
      durationDays: number;
      credits: number;
      badge: string;
      description: string;
      features: string;
      introPriceTry: number | null;
      introNote: string;
      active: boolean;
      sortOrder: number;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    if (data.priceTry < 0 || data.credits < 0 || data.durationDays < 1) {
      throw new Error("Fiyat, kredi veya süre geçersiz.");
    }
    const updated = await sql`
      update premium_plans
      set name = ${data.name.trim().slice(0, 80)},
          price_try = ${data.priceTry},
          period_label = ${data.periodLabel.trim().slice(0, 40)},
          duration_days = ${Math.trunc(data.durationDays)},
          credits = ${Math.trunc(data.credits)},
          badge = ${data.badge.trim().slice(0, 40)},
          description = ${data.description.trim().slice(0, 240)},
          features = ${data.features.slice(0, 1200)},
          intro_price_try = ${data.introPriceTry},
          intro_note = ${data.introNote.trim().slice(0, 160)},
          active = ${data.active},
          sort_order = ${Math.trunc(data.sortOrder)},
          updated_at = now()
      where id = ${data.id.trim()}
      returning id
    `;
    if (!updated[0]) throw new Error("Premium paket bulunamadı.");
    return { ok: true };
  });
