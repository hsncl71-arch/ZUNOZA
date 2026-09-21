alter table cost_ledger add column if not exists cost_in_usd_ticks bigint;
alter table cost_ledger add column if not exists cost_source text not null default 'unverified';
alter table cost_ledger add column if not exists status text not null default 'ok';
create index if not exists cost_ledger_source_idx on cost_ledger (cost_source, created_at desc);
