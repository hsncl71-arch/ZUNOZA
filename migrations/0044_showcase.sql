-- Admin-managed homepage inspiration reel (İlham Al / Bunun Gibi Oluştur)

create table if not exists showcase_clips (
  id text primary key,
  title text not null,
  category text not null,
  badge text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  preview_url text not null,
  poster_url text not null default '',
  subject text not null,
  scene text not null,
  negative_prompt text not null default '',
  style text not null default '',
  camera text not null default '',
  lighting text not null default '',
  motion text not null default '',
  duration_seconds integer not null default 10,
  aspect text not null default '16:9',
  quality text not null default 'hd',
  model text not null default 'otomatik',
  seed text not null default '',
  voice_mode text not null default 'ortam',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists showcase_clips_sort_idx on showcase_clips (active, sort_order, id);
