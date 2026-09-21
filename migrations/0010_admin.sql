-- Yönetici paneli: kullanıcı durumu, stüdyo limitleri, destek, duyuru, audit

alter table zunoza_profiles add column if not exists is_active boolean not null default true;
alter table zunoza_profiles add column if not exists blocked boolean not null default false;
alter table zunoza_profiles add column if not exists package_id text;
alter table zunoza_profiles add column if not exists daily_limit integer;

create table if not exists studio_settings (
  studio_id text primary key,
  enabled boolean not null default true,
  daily_limit integer,
  updated_at timestamptz not null default now()
);

insert into studio_settings (studio_id, enabled, daily_limit) values
  ('video', true, null),
  ('gorsel', true, null),
  ('muzik', true, null),
  ('tts', true, null),
  ('klip', true, null),
  ('montaj', true, null)
on conflict (studio_id) do nothing;

create table if not exists support_tickets (
  id text primary key,
  user_id text not null,
  kind text not null,
  body text not null,
  status text not null default 'yeni',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_created_idx on support_tickets (created_at desc);

create table if not exists system_announcements (
  id text primary key,
  title text not null,
  body text not null,
  active boolean not null default true,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_audit_log (
  id text primary key,
  admin_id text not null,
  action text not null,
  target_user_id text,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_idx on admin_audit_log (created_at desc);
