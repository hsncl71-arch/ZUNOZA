-- Müzik Stüdyosu: kullanıcıya ait üretilmiş müzik varlıkları

create table if not exists music_assets (
  id text primary key,
  user_id text not null,
  prompt text not null,
  genre text,
  mood text,
  duration_seconds integer not null default 15,
  instrumental boolean not null default true,
  audio_url text,
  mime_type text not null default 'audio/mpeg',
  byte_size integer,
  status text not null default 'tamamlandi',
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists music_assets_user_idx on music_assets (user_id, created_at desc);
