/** Configurable builder credit costs. Defaults from credit-economy. */
import { DEFAULT_FEATURE_CREDITS } from "./credit-economy.ts";

export const BUILDER_CREDIT_COSTS = {
  create: DEFAULT_FEATURE_CREDITS.builder_create,
  edit: DEFAULT_FEATURE_CREDITS.builder_edit,
  repair: DEFAULT_FEATURE_CREDITS.builder_repair,
  publish: DEFAULT_FEATURE_CREDITS.builder_publish,
} as const;

export type BuilderCreditAction = keyof typeof BUILDER_CREDIT_COSTS;

export function builderCreditCost(action: BuilderCreditAction) {
  return BUILDER_CREDIT_COSTS[action] ?? 0;
}

/** Keep a catalog 0 (free) instead of replacing it with the default. */
export function readCatalogCost(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.trunc(n);
}

export function builderCreditHint(opts: {
  unlimited?: boolean;
  cost: number;
  balance?: number | null;
  action?: "send" | "retry";
}) {
  const who = opts.action === "retry" ? "Tekrar deneme" : "Her gönderim";
  if (opts.unlimited) return `${who} kredi düşmez (sınırsız hesap).`;
  if (opts.cost <= 0) return `${who} kredi düşmez.`;
  const left = opts.balance != null ? ` Kalan: ${opts.balance} kredi.` : "";
  return `${who} ${opts.cost} kredi kullanır.${left}`;
}
