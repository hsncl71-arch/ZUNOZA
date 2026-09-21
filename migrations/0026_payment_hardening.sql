-- Payment hardening: kuruş-safe price, premium window, refund clawback uniqueness.
-- Does not change package or premium list prices.

alter table payment_orders
  alter column price_try type numeric(12,2)
  using price_try::numeric(12,2);

alter table zunoza_profiles
  add column if not exists premium_until timestamptz;

create unique index if not exists credit_ledger_payment_refund_idx
  on credit_ledger (payment_order_id)
  where payment_order_id is not null and kind = 'paket_iade';
