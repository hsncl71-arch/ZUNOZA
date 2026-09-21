-- Seslendirme Stüdyosu: kullanıcıya ait üretilmiş TTS sesleri

create table if not exists voice_assets (
  id text primary key,
  user_id text not null,
  text text not null,
  voice_id text not null,
  language text not null default 'tr',
  audio_url text,
  mime_type text not null default 'audio/mpeg',
  byte_size integer,
  status text not null default 'tamamlandi',
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists voice_assets_user_idx on voice_assets (user_id, created_at desc);
