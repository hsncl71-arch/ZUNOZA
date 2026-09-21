-- ZUNOZA AI VIDEO core schema

create table if not exists zunoza_profiles (
  user_id text primary key,
  display_name text,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists credit_wallets (
  user_id text primary key,
  balance integer not null default 0,
  constraint credit_wallets_balance_nonneg check (balance >= 0)
);

create table if not exists credit_ledger (
  id text primary key,
  user_id text not null,
  amount integer not null,
  kind text not null,
  job_id text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_user_idx on credit_ledger (user_id, created_at desc);
create unique index if not exists credit_ledger_job_kind_idx
  on credit_ledger (job_id, kind) where job_id is not null;

create table if not exists pricing_rules (
  duration_seconds integer not null,
  quality text not null,
  credits integer not null,
  primary key (duration_seconds, quality)
);

insert into pricing_rules (duration_seconds, quality, credits) values
  (5, 'ekonomik', 5), (5, 'standart', 5), (5, 'hd', 8), (5, 'ultra', 10),
  (10, 'ekonomik', 10), (10, 'standart', 10), (10, 'hd', 15), (10, 'ultra', 20),
  (15, 'ekonomik', 15), (15, 'standart', 15), (15, 'hd', 23), (15, 'ultra', 30),
  (30, 'ekonomik', 30), (30, 'standart', 30), (30, 'hd', 45), (30, 'ultra', 60)
on conflict (duration_seconds, quality) do nothing;

create table if not exists credit_packages (
  id text primary key,
  name text not null,
  credits integer not null,
  price_try integer,
  popular boolean not null default false,
  contact_only boolean not null default false,
  sort_order integer not null default 0
);

insert into credit_packages (id, name, credits, price_try, popular, contact_only, sort_order) values
  ('baslangic', 'Başlangıç', 100, 299, false, false, 1),
  ('plus', 'Plus', 500, 999, true, false, 2),
  ('pro', 'Pro', 1500, 2499, false, false, 3),
  ('isletme', 'İşletme', 5000, null, false, true, 4)
on conflict (id) do nothing;

create table if not exists video_jobs (
  id text primary key,
  user_id text not null,
  prompt text not null,
  negative_prompt text,
  duration_seconds integer not null,
  aspect text not null,
  quality text not null,
  model text not null,
  voice_mode text not null default 'sessiz',
  language text not null default 'tr',
  source_kind text not null default 'metin',
  credit_cost integer not null default 0,
  status text not null default 'hazirlaniyor',
  provider text,
  provider_request_id text,
  video_url text,
  error_message text,
  is_demo boolean not null default false,
  storyboard_id text,
  scene_index integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists video_jobs_user_idx on video_jobs (user_id, created_at desc);

create table if not exists storyboard_projects (
  id text primary key,
  user_id text not null,
  title text not null default 'Sahne planı',
  created_at timestamptz not null default now()
);
