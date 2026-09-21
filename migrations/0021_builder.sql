-- İnşa Et: kullanıcı web uygulamaları (ana ZUNOZA medyasından izole)

create table if not exists builder_projects (
  id text primary key,
  user_id text not null,
  name text not null,
  prompt text not null,
  description text,
  status text not null default 'hazirlaniyor',
  current_version int not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists builder_projects_user_idx on builder_projects (user_id, updated_at desc);

create table if not exists builder_versions (
  id text primary key,
  project_id text not null references builder_projects(id) on delete cascade,
  user_id text not null,
  version int not null,
  html text not null,
  plan_json text,
  summary text,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);
create index if not exists builder_versions_proj_idx on builder_versions (project_id, version desc);

create table if not exists builder_messages (
  id text primary key,
  project_id text not null references builder_projects(id) on delete cascade,
  user_id text not null,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists builder_messages_proj_idx on builder_messages (project_id, created_at);

create table if not exists builder_jobs (
  id text primary key,
  project_id text not null references builder_projects(id) on delete cascade,
  user_id text not null,
  kind text not null default 'create',
  status text not null default 'analyzing',
  step_label text,
  instruction text,
  draft_html text,
  plan_json text,
  error_message text,
  retry_count int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists builder_jobs_proj_idx on builder_jobs (project_id, created_at desc);

create table if not exists builder_assets (
  id text primary key,
  project_id text not null references builder_projects(id) on delete cascade,
  user_id text not null,
  kind text not null default 'image',
  file_name text,
  r2_key text,
  created_at timestamptz not null default now()
);
