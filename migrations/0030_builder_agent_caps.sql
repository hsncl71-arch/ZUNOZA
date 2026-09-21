-- İnşa Et agent observability + hard caps (ticks, API calls, charged credits)
alter table builder_jobs add column if not exists api_calls int not null default 0;
alter table builder_jobs add column if not exists tick_count int not null default 0;
alter table builder_jobs add column if not exists credits_charged int not null default 0;

create index if not exists builder_jobs_user_status_idx on builder_jobs (user_id, status, created_at desc);
