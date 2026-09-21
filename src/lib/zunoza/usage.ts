import { getSql } from "@/lib/db";
import { claimIdempotency } from "@/lib/zunoza/resilience";

/** Cost telemetry only. Does not change credit prices. */
export async function logUsageEvent(
  userId: string,
  kind: string,
  model: string | null,
  units: number,
  meta: string,
  idempotencyKey?: string | null,
  estimatedCostUsd?: number | null,
) {
  try {
    if (!claimIdempotency(idempotencyKey)) return;
    const sql = await getSql();
    const key = idempotencyKey?.trim() || null;
    const cost = estimatedCostUsd != null && Number.isFinite(estimatedCostUsd) ? estimatedCostUsd : null;
    if (key) {
      try {
        await sql`
          insert into usage_events (id, user_id, kind, model, units, meta, idempotency_key, estimated_cost_usd)
          values (${crypto.randomUUID()}, ${userId}, ${kind}, ${model}, ${units}, ${meta.slice(0, 400)}, ${key}, ${cost})
          on conflict (idempotency_key) do nothing
        `;
        return;
      } catch {
        /* column/index may lag a deploy; fall through */
      }
    }
    try {
      await sql`
        insert into usage_events (id, user_id, kind, model, units, meta, estimated_cost_usd)
        values (${crypto.randomUUID()}, ${userId}, ${kind}, ${model}, ${units}, ${meta.slice(0, 400)}, ${cost})
      `;
    } catch {
      await sql`
        insert into usage_events (id, user_id, kind, model, units, meta)
        values (${crypto.randomUUID()}, ${userId}, ${kind}, ${model}, ${units}, ${meta.slice(0, 400)})
      `;
    }
  } catch {
    /* telemetry must not block media */
  }
}
