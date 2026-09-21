alter table zunoza_profiles add column if not exists age_confirmed_at timestamptz;

alter table legal_company add column if not exists kvkk_email text not null default '';
alter table legal_company add column if not exists kvkk_contact_name text not null default '';

create table if not exists consent_records (
  id text primary key,
  user_id text not null,
  kind text not null,
  version text not null,
  granted boolean not null,
  source text not null default 'app',
  created_at timestamptz not null default now()
);
create index if not exists consent_records_user_idx on consent_records (user_id, created_at desc);

create table if not exists privacy_requests (
  id text primary key,
  user_id text not null,
  kind text not null,
  body text not null,
  status text not null default 'alindi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists privacy_requests_user_idx on privacy_requests (user_id, created_at desc);

create table if not exists erasure_requests (
  id text primary key,
  user_id text not null,
  status text not null,
  detail text not null default '',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists voice_clone_events (
  id text primary key,
  user_id text not null,
  consent_id text,
  voice_deleted boolean not null default false,
  error_message text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists retention_settings (
  category text primary key,
  retain_days integer,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into retention_settings (category, retain_days, enabled) values
  ('hesap', null, false),
  ('medya', null, false),
  ('sohbet_hafiza', null, false),
  ('odeme', null, false),
  ('log_oturum', null, false)
on conflict (category) do nothing;
