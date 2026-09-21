create table if not exists builder_queue (
  id text primary key,
  project_id text not null references builder_projects(id) on delete cascade,
  user_id text not null,
  instruction text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists builder_queue_proj_idx on builder_queue (project_id, sort_order, created_at);
