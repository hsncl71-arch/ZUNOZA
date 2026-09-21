/** xAI billed cost. 1 USD = 10_000_000_000 ticks. Never estimate here. */

export const XAI_TICKS_PER_USD = 10_000_000_000;

export type XaiCostSource = "xai_ticks" | "unverified";

export type XaiUsage = {
  ticks: number | null;
  usd: number | null;
  source: XaiCostSource;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
  reasoningTokens: number | null;
  numSources: number | null;
};

export function emptyXaiUsage(): XaiUsage {
  return {
    ticks: null,
    usd: null,
    source: "unverified",
    inputTokens: null,
    outputTokens: null,
    cachedTokens: null,
    reasoningTokens: null,
    numSources: null,
  };
}

function asRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  return input as Record<string, unknown>;
}

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.trunc(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

export function ticksToUsd(ticks: number) {
  if (!Number.isFinite(ticks) || ticks < 0) return null;
  return Math.round((ticks / XAI_TICKS_PER_USD) * 1e10) / 1e10;
}

export function parseXaiUsage(input: unknown): XaiUsage {
  const out = emptyXaiUsage();
  const root = asRecord(input);
  if (!root) return out;
  const usage = asRecord(root.usage) || (root.cost_in_usd_ticks != null ? root : null) || asRecord(asRecord(root.video)?.usage);
  if (!usage) return out;
  const ticks = asInt(usage.cost_in_usd_ticks);
  const details = asRecord(usage.prompt_tokens_details) || asRecord(usage.input_tokens_details);
  const outDetails = asRecord(usage.completion_tokens_details) || asRecord(usage.output_tokens_details);
  out.inputTokens = asInt(usage.input_tokens ?? usage.prompt_tokens);
  out.outputTokens = asInt(usage.output_tokens ?? usage.completion_tokens);
  out.cachedTokens = asInt(details?.cached_tokens ?? details?.cached_prompt_text_tokens);
  out.reasoningTokens = asInt(outDetails?.reasoning_tokens ?? usage.reasoning_tokens);
  out.numSources = asInt(usage.num_sources_used ?? usage.num_server_side_tools_used);
  if (ticks == null) return out;
  out.ticks = ticks;
  out.usd = ticksToUsd(ticks);
  out.source = "xai_ticks";
  return out;
}

export function mergeXaiUsage(current: XaiUsage, next: XaiUsage): XaiUsage {
  if (next.source !== "xai_ticks") {
    return {
      ...current,
      inputTokens: next.inputTokens ?? current.inputTokens,
      outputTokens: next.outputTokens ?? current.outputTokens,
      cachedTokens: next.cachedTokens ?? current.cachedTokens,
      reasoningTokens: next.reasoningTokens ?? current.reasoningTokens,
      numSources: next.numSources ?? current.numSources,
    };
  }
  return next;
}

export function parseXaiUsageHeader(headers: Headers | { get(name: string): string | null }) {
  const raw = headers.get("x-usage-cost-in-usd-ticks") || headers.get("x-cost-in-usd-ticks");
  if (!raw) return emptyXaiUsage();
  return parseXaiUsage({ usage: { cost_in_usd_ticks: raw } });
}

export function xaiLogFields(usage: XaiUsage) {
  return {
    actualCostUsd: usage.usd,
    costInUsdTicks: usage.ticks,
    costSource: usage.source,
    inputTokens: usage.inputTokens ?? undefined,
    outputTokens: usage.outputTokens ?? undefined,
  };
}
