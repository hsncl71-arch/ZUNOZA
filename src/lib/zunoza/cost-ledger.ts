import { getSql } from "@/lib/db";
import { USD_TRY_SNAPSHOT } from "@/lib/zunoza/provider-cost";
import { COVERED_TRY_PER_CREDIT } from "@/lib/zunoza/credit-economy";
import type { XaiCostSource } from "@/lib/zunoza/xai-usage";

export type CostLedgerRow = {
  userId: string;
  jobId?: string | null;
  feature: string;
  provider?: string | null;
  model?: string | null;
  durationSeconds?: number | null;
  resolution?: string | null;
  quality?: string | null;
  apiRequestCount?: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  providerCostUsd: number;
  exchangeRate?: number;
  creditsCharged: number;
  unlimited?: boolean;
  costInUsdTicks?: number | null;
  costSource?: XaiCostSource;
  status?: string;
};

export async function writeCostLedger(row: CostLedgerRow) {
  try {
    const usd = Number(row.providerCostUsd);
    if (!Number.isFinite(usd)) return;
    const rate = row.exchangeRate && row.exchangeRate > 0 ? row.exchangeRate : USD_TRY_SNAPSHOT;
    const costTry = Math.round(usd * rate * 100) / 100;
    const credits = Math.max(0, Math.trunc(row.creditsCharged || 0));
    const revenue = Math.round(credits * COVERED_TRY_PER_CREDIT * 100) / 100;
    const margin = Math.round((revenue - costTry) * 100) / 100;
    const source = row.costSource === "xai_ticks" ? "xai_ticks" : "unverified";
    const ticks = row.costInUsdTicks != null && Number.isFinite(row.costInUsdTicks) ? Math.trunc(row.costInUsdTicks) : null;
    const status = (row.status || "ok").slice(0, 24);
    const sql = await getSql();
    const id = crypto.randomUUID();
    if (row.jobId) {
      await sql.query(
        `insert into cost_ledger (
           id, user_id, job_id, feature, provider, model, duration_seconds, resolution, quality,
           api_request_count, input_tokens, output_tokens, provider_cost_usd, exchange_rate,
           provider_cost_try, credits_charged, estimated_revenue_allocation, estimated_margin, is_admin_user,
           cost_in_usd_ticks, cost_source, status
         ) values (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
         )
         on conflict (job_id, feature) where job_id is not null do update set
           provider = excluded.provider,
           model = excluded.model,
           duration_seconds = excluded.duration_seconds,
           resolution = excluded.resolution,
           quality = excluded.quality,
           api_request_count = cost_ledger.api_request_count + 1,
           input_tokens = coalesce(excluded.input_tokens, cost_ledger.input_tokens),
           output_tokens = coalesce(excluded.output_tokens, cost_ledger.output_tokens),
           provider_cost_usd = case when excluded.cost_source = 'xai_ticks' then excluded.provider_cost_usd else cost_ledger.provider_cost_usd end,
           provider_cost_try = case when excluded.cost_source = 'xai_ticks' then excluded.provider_cost_try else cost_ledger.provider_cost_try end,
           cost_in_usd_ticks = case when excluded.cost_source = 'xai_ticks' then excluded.cost_in_usd_ticks else cost_ledger.cost_in_usd_ticks end,
           cost_source = case when excluded.cost_source = 'xai_ticks' then 'xai_ticks' else cost_ledger.cost_source end,
           status = excluded.status,
           credits_charged = greatest(cost_ledger.credits_charged, excluded.credits_charged),
           estimated_revenue_allocation = excluded.estimated_revenue_allocation,
           estimated_margin = excluded.estimated_margin`,
        [
          id,
          row.userId,
          row.jobId,
          row.feature.slice(0, 80),
          row.provider ?? null,
          row.model ?? null,
          row.durationSeconds ?? null,
          row.resolution ?? null,
          row.quality ?? null,
          Math.max(1, row.apiRequestCount ?? 1),
          row.inputTokens ?? null,
          row.outputTokens ?? null,
          usd,
          rate,
          costTry,
          credits,
          revenue,
          margin,
          Boolean(row.unlimited),
          ticks,
          source,
          status,
      
... 