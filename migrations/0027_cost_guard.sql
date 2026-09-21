-- Real-USD cost telemetry + global spend caps. Does not change credit prices.
alter table usage_events add column if not exists estimated_cost_usd numeric(12,6);
create index if not exists usage_events_created_idx on usage_events (created_at desc);

insert into app_settings (key, value) values
  ('cost_cap_enabled', 'true'),
  ('cost_cap_daily_usd', '50'),
  ('cost_cap_monthly_usd', '400'),
  ('usd_try_rate', '48.62')
on conflict (key) do nothing;
