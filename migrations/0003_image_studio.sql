-- Görsel Stüdyo: kullanıcıya ait üretilmiş görseller

create table if not exists image_assets (
  id text primary key,
  user_id text not null,
  prompt text not null,
  aspect text not null,
  style text,
  model text not null,
  image_url text,
  mime_type text not null default 'image/jpeg',
  byte_size integer,
  status text not null default 'tamamlandi',
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists image_assets_user_idx on image_assets (user_id, created_at desc);
