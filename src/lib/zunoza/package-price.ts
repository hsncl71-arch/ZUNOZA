/** Payable TRY from admin package row. Never take the amount from the client. */
export function payablePackageTry(
  priceTry: number | null | undefined,
  discountPct: number | null | undefined,
): number | null {
  const price = Number(priceTry);
  if (!Number.isFinite(price) || price <= 0) return null;
  const discount = Math.min(90, Math.max(0, Math.trunc(Number(discountPct) || 0)));
  const payable = discount > 0 ? Math.round(price * (1 - discount / 100)) : Math.round(price);
  if (!Number.isFinite(payable) || payable <= 0) return null;
  return payable;
}

/** Two-decimal TRY for premium (kuruş). Does not change credit-pack whole-lira rounding. */
export function payableTryAmount(priceTry: number | string | null | undefined): number | null {
  const n = Number(priceTry);
  if (!Number.isFinite(n) || n <= 0) return null;
  const payable = Math.round(n * 100) / 100;
  if (!Number.isFinite(payable) || payable <= 0) return null;
  return payable;
}
