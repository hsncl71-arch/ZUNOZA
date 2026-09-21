-- Device uploads for Montage Studio (video / image / audio from phone or computer).

create table if not exists studio_uploads (
  id text primary key,
  user_id text not null,
  kind text not null,
  label text not null default 'Yükleme',
  mime_type text not null,
  byte_size integer,
  duration_seconds double precision,
  media_url text,
  status text not null default 'tamamlandi',
  created_at timestamptz not null default now(),
  constraint studio_uploads_kind_chk check (kind in ('video', 'image', 'audio'))
);
create index if not exists studio_uploads_user_idx on studio_uploads (user_id, created_at desc);
