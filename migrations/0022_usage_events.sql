-- Image/studio usage log for cost telemetry. Does not change credit prices.
create table if not exists usage_events (
  id text primary key,
  user_id text not null,
  kind text not null,
  model text,
  units integer not null default 1,
  meta text,
  created_at timestamptz not null default now()
);
create index if not exists usage_events_user_idx on usage_events (user_id, created_at desc);
