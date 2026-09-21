-- StoreKit / Play Billing receipts. Rows are written only after Apple/Google
-- verify. Unique (platform, transaction_id) blocks double credit. Unused until
-- STORE_BILLING_READY. Web iyzico payment_orders is unchanged.

create table if not exists store_transactions (
  id text primary key,
  user_id text not null,
  platform text not null,
  transaction_id text not null,
  product_id text not null,
  package_id text not null,
  kind text not null,
  event text not null,
  status text not null,
  credited boolean not null default false,
  created_at timestamptz not null default now(),
  unique (platform, transaction_id)
);

create index if not exists store_transactions_user_idx
  on store_transactions (user_id, created_at desc);
