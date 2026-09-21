-- Durable per-user rate windows for serverless. Does not change credit prices.
create table if not exists rate_windows (
  user_id text not null,
  kind text not null,
  window_start timestamptz not null,
  n integer not null default 0,
  primary key (user_id, kind, window_start)
);
create index if not exists rate_windows_start_idx on rate_windows (window_start);
