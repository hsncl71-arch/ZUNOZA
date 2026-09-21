-- Dizi / uzun bölüm: 1–5 dk, mevcut 5/10/15 sn klipler + montaj birleşimi

create table if not exists series_shows (
  id text primary key,
  user_id text not null,
  title text not null,
  genre text not null default 'drama',
  language text not null default 'tr',
  aspect text not null default '9:16',
  quality text not null default 'hd',
  bible_json text not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists series_shows_user_idx on series_shows (user_id, updated_at desc);

create table if not exists series_episodes (
  id text primary key,
  series_id text not null,
  user_id text not null,
  number integer not null default 1,
  title text not null default 'Bölüm',
  prompt text not null,
  duration_seconds integer not null,
  mode text not null default 'auto',
  status text not null default 'planlama',
  language text not null default 'tr',
  aspect text not null default '9:16',
  quality text not null default 'hd',
  script_json text not null default '{}',
  scenes_json text not null default '[]',
  montage_id text,
  output_url text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists series_episodes_user_idx on series_episodes (user_id, updated_at desc);
create index if not exists series_episodes_series_idx on series_episodes (series_id, number);
