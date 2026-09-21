/** Credit a wallet only after Apple/Google verify. Unique (platform, transaction_id). */

import { getSql } from "../db.ts";
import type { StoreProduct } from "./store-billing.ts";
import type { StoreEventKind, StorePlatform } from "./store-verify.ts";
import { storeEventWouldCredit, storeIdempotencyKey } from "./store-verify.ts";

export async function applyVerifiedStoreTransaction(opts: {
  userId: string;
  platform: StorePlatform;
  transactionId: string;
  product: StoreProduct;
  event: StoreEventKind;
}) {
  if (!storeEventWouldCredit(opts.event)) {
    return { ok: true as const, credited: false as const, already: false as const, message: "Bu mağaza olayı kredi yüklemez." };
  }
  const sql = await getSql();
  const txn = opts.transactionId.trim();
  const id = crypto.randomUUID();
  const inserted = await sql<{ id: string }>`
    insert into store_transactions (
      id, user_id, platform, transaction_id, product_id, package_id, kind, event, status, credited
    ) values (
      ${id}, ${opts.userId}, ${opts.platform}, ${txn},
      ${opts.platform === "ios" ? opts.product.appleProductId : opts.product.googleProductId},
      ${opts.product.packageId}, ${opts.product.kind}, ${opts.event}, ${"dogrulandi"}, ${false}
    )
    on conflict (platform, transaction_id) do nothing
    returning id
  `;
  const rowId = inserted[0]?.id;
  if (!rowId) {
    const [existing] = await sql<{ credited: boolean }>`
      select credited from store_transactions
      where platform = ${opts.platform} and transaction_id = ${txn}
      limit 1
    `;
    if (existing?.credited) {
      return { ok: true as const, credited: false as const, already: true as const, message: "Bu satın alma zaten işlendi." };
    }
  }
  const ledgerJob = storeIdempotencyKey(opts.platform, txn);
  const ledgerId = crypto.randomUUID();
  if (opts.product.kind === "subscription") {
    const [plan] = await sql<{ duration_days: number; credits: number; name: string }>`
      select duration_days, credits, name from premium_plans where id = ${opts.product.packageId} limit 1
    `;
    const days = Math.max(0, Math.trunc(Number(plan?.duration_days) || 0));
    const credits = Math.max(0, Math.trunc(Number(plan?.credits) || 0));
    if (credits > 0) {
      await sql.query(
        `with ins as (
           insert into credit_ledger (id, user_id, amount, kind, job_id, note)
           values ($1, $2, $3, 'magaza_satin_al', $4, $5)
           on conflict (job_id, kind) where (job_id is not null) do nothing
           returning id, amount
         )
         update credit_wallets
         set balance = credit_wallets.balance + ins.amount
         from ins
         where credit_wallets.user_id = $2`,
        [ledgerId, opts.userId, credits, ledgerJob, (plan?.name || "Premium").slice(0, 240)],
      );
    }
    if (days > 0) {
      await sql`
        update zunoza_profiles
        set package_id = ${opts.product.packageId},
            premium_until = greatest(coalesce(premium_until, now()), now()) + (${days} * interval '1 day')
        where user_id = ${opts.userId}
      `;
    }
  } else {
    const [pack] = await sql<{ credits: number; bonus_credits: number | null; name: string }>`
      select credits, coalesce(bonus_credits, 0) as bonus_credits, name
      from credit_packages where id = ${opts.product.packageId} limit 1
    `;
    const credits = Math.max(0, Math.trunc(Number(pack?.credits) || 0) + Math.trunc(Number(pack?.bonus_credits) || 0));
    if (credits < 1) {
      return { ok: false as const, credited: false as const, already: false as const, message: "Paket kredisi bulunamadı. Kredi yüklenmedi." };
    }
    await sql.query(
      `with ins as (
         insert into credit_ledger (id, user_id, amount, kind, job_id, note)
         values ($1, $2, $3, 'magaza_satin_al', $4, $5)
         on conflict (job_id, kind) where (job_id is not null) do nothing
         returning id, amount
       ),
       w as (
         insert into credit_wallets (user_id, balance)
         select $2, ins.amount from ins
         on conflict (user_id) do update 
... 