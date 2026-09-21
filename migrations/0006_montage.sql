-- Montaj Stüdyosu: kullanıcı montaj projeleri ve render durumu

create table if not exists montage_projects (
  id text primary key,
  user_id text not null,
  title text not null default 'Montaj',
  aspect text not null default '9:16',
  clips_json text not null default '[]',
  voice_asset_id text,
  music_asset_id text,
  storyboard_id text,
  status text not null default 'hazirlaniyor',
  provider text,
  provider_render_id text,
  output_url text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists montage_projects_user_idx on montage_projects (user_id, updated_at desc);
