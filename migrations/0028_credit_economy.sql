-- Credit economy rebalance + internal cost ledger.
-- iyzico %3 is a pricing assumption, not a signed contract rate.

create table if not exists feature_credit_rules (
  feature text primary key,
  credits integer not null,
  updated_at timestamptz not null default now()
);

create table if not exists cost_ledger (
  id text primary key,
  user_id text not null,
  job_id text,
  feature text not null,
  provider text,
  model text,
  duration_seconds integer,
  resolution text,
  quality text,
  api_request_count integer not null default 1,
  input_tokens integer,
  output_tokens integer,
  provider_cost_usd numeric(12,6) not null default 0,
  exchange_rate numeric(12,4) not null default 48.62,
  provider_cost_try numeric(12,4) not null default 0,
  credits_charged integer not null default 0,
  estimated_revenue_allocation numeric(12,4),
  estimated_margin numeric(12,4),
  is_admin_user boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists cost_ledger_user_idx on cost_ledger (user_id, created_at desc);
create index if not exists cost_ledger_feature_idx on cost_ledger (feature, created_at desc);
create index if not exists cost_ledger_created_idx on cost_ledger (created_at desc);
create unique index if not exists cost_ledger_job_feature_idx
  on cost_ledger (job_id, feature) where job_id is not null;

insert into pricing_rules (duration_seconds, quality, credits) values
  (5, 'ekonomik', 16), (5, 'standart', 28), (5, 'hd', 33), (5, 'ultra', 50),
  (10, 'ekonomik', 32), (10, 'standart', 56), (10, 'hd', 65), (10, 'ultra', 100),
  (15, 'ekonomik', 48), (15, 'standart', 84), (15, 'hd', 97), (15, 'ultra', 150),
  (30, 'ekonomik', 96), (30, 'standart', 168), (30, 'hd', 194), (30, 'ultra', 300)
on conflict (duration_seconds, quality) do update set credits = excluded.credits;

insert into feature_credit_rules (feature, credits) values
  ('image_generate_1k', 2),
  ('image_generate_2k', 3),
  ('image_edit_1k', 3),
  ('image_edit_2k', 4),
  ('music_15', 2),
  ('music_30', 3),
  ('music_45', 5),
  ('voice_song_15', 16),
  ('voice_song_30', 18),
  ('voice_song_45', 22),
  ('tts_base', 1),
  ('assistant_chat', 1),
  ('assistant_web', 2),
  ('assistant_speak', 1),
  ('lyrics', 1),
  ('voice_live', 32),
  ('builder_create', 8),
  ('builder_edit', 4),
  ('builder_repair', 3),
  ('builder_publish', 0),
  ('montage_per_15s', 3),
  ('video_i2v_surcharge', 1)
on conflict (feature) do update set credits = excluded.credits, updated_at = now();

update credit_packages set credits = 40, description = 'Kısa denemeler için'
where id = 'mini';
update credit_packages set credits = 100, description = 'Düzenli üretim için'
where id = 'baslangic';
update credit_packages set credits = 160, description = 'En çok tercih edilen paket'
where id = 'plus';
update credit_packages set credits = 300, description = 'Profesyonel üretim'
where id = 'pro';
update credit_packages set credits = 620, description = 'Yoğun üretim için'
where id = 'ultra';
update credit_packages set credits = 980, description = 'En yüksek kredi paketi'
where id = 'max';

update premium_plans set credits = 180, features = E'Sınırsız yaratıcılık\nSinematik AI efektleri\nGelişmiş AI düzenleme\nHaftada 180 kredi'
where id = 'weekly';
update premium_plans set credits = 600, features = E'Sınırsız yaratıcılık\nSinematik AI efektleri\nGelişmiş AI düzenleme\nAyda 600 kredi'
where id = 'monthly';
update premium_plans set credits = 2800, features = E'Sınırsız yaratıcılık\nSinematik AI efektleri\nGelişmiş AI düzenleme\n6 ay boyunca kredi'
where id = 'sixmo';
update premium_plans set credits = 4800, features = E'Sınırsız yaratıcılık\nSinematik AI efektleri\nGelişmiş AI düzenleme\nYıllık kredi paketi'
where id = 'yearly';

insert into app_settings (key, value) values
  ('iyzico_assumption_pct', '3'),
  ('safety_margin_pct', '20'),
  ('credit_per_usd', '40'),
  ('video_coef_ekonomik', '1'),
  ('video_coef_standart', '1'),
  ('video_coef_hd', '1.15'),
  ('video_coef_ultra', '1'),
  ('video_usd_480p', 
... 