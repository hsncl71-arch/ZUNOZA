-- iyzico kredi paket ödemeleri. Medya dosyaları R2'de kalır; burada yalnızca sipariş kaydı vardır.

create table if not exists payment_orders (
  id text primary key,
  user_id text not null,
  package_id text not null,
  package_name text not null,
  credits integer not null,
  price_try integer not null,
  currency text not null default 'TRY',
  status text not null default 'bekliyor',
  provider text not null default 'iyzico',
  conversation_id text not null,
  token text,
  provider_payment_id text,
  error_message text,
  credited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payment_orders_conversation_idx
  on payment_orders (conversation_id);

create unique index if not exists payment_orders_provider_payment_idx
  on payment_orders (provider_payment_id)
  where provider_payment_id is not null;

create index if not exists payment_orders_user_idx
  on payment_orders (user_id, created_at desc);

alter table credit_ledger add column if not exists payment_order_id text;

create unique index if not exists credit_ledger_payment_credit_idx
  on credit_ledger (payment_order_id)
  where payment_order_id is not null and kind = 'paket_satin_al';
