alter table builder_queue add column if not exists status text not null default 'queued';
alter table builder_queue add column if not exists job_id text;
alter table builder_queue add column if not exists error_message text;
alter table builder_queue add column if not exists started_at timestamptz;
alter table builder_queue add column if not exists finished_at timestamptz;
create index if not exists builder_queue_status_idx
  on builder_queue (project_id, status, sort_order, created_at);
create unique index if not exists builder_queue_one_active_idx
  on builder_queue (project_id) where status = 'active';
