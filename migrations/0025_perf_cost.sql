-- Performance indexes + usage idempotency. Does not change credit prices.
alter table usage_events add column if not exists idempotency_key text;
create unique index if not exists usage_events_idk_idx on usage_events (idempotency_key) where idempotency_key is not null;
create index if not exists usage_events_kind_idx on usage_events (kind, created_at desc);
create index if not exists video_jobs_user_status_idx on video_jobs (user_id, status);
create index if not exists builder_jobs_user_status_idx on builder_jobs (user_id, status);
