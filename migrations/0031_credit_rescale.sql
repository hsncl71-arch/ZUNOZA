-- Psychological credit rescale: 48 credits/USD → 7 credits/USD.
-- 15s Standart 102 → 15. Package credits and existing wallets scale 7/48
-- so buying power stays the same. List TRY prices are unchanged.
-- iyzico %3 remains a pricing assumption.

alter table credit_packages add column if not exists bonus_credits integer not null default 0;

insert into pricing_rules (duration_seconds, quality, credits) values
  (5, 'ekonomik', 3), (5, 'standart', 5), (5, 'hd', 6), (5, 'ultra', 9),
  (10, 'ekonomik', 6), (10, 'standart', 10), (10, 'hd', 12), (10, 'ultra', 18),
  (15, 'ekonomik', 9), (15, 'standart', 15), (15, 'hd', 17), (15, 'ultra', 27),
  (30, 'ekonomik', 18), (30, 'standart', 30), (30, 'hd', 34), (30, 'ultra', 54)
on conflict (duration_seconds, quality) do update set credits = excluded.credits;

insert into feature_credit_rules (feature, credits) values
  ('image_generate_1k', 1),
  ('image_generate_2k', 1),
  ('image_edit_1k', 1),
  ('image_edit_2k', 1),
  ('music_15', 1),
  ('music_30', 1),
  ('music_45', 1),
  ('voice_song_15', 3),
  ('voice_song_30', 4),
  ('voice_song_45', 4),
  ('tts_base', 1),
  ('assistant_chat', 1),
  ('assistant_web', 1),
  ('assistant_speak', 1),
  ('lyrics', 1),
  ('voice_live', 6),
  ('builder_create', 2),
  ('builder_edit', 1),
  ('builder_repair', 1),
  ('builder_publish', 0),
  ('montage_per_15s', 1),
  ('video_i2v_surcharge', 1)
on conflict (feature) do update set credits = excluded.credits, updated_at = now();

update credit_packages set credits = 6, description = '≈ 2 ekonomik (5 sn) video'
where id = 'mini';
update credit_packages set credits = 15, description = '≈ 5 ekonomik (5 sn) veya 1 standart (15 sn) video'
where id = 'baslangic';
update credit_packages set credits = 24, description = '≈ 8 ekonomik, 2 standart (10 sn) veya 1 standart (15 sn) video'
where id = 'plus';
update credit_packages set credits = 44, description = '≈ 14 ekonomik veya 2 standart (15 sn) video'
where id = 'pro';
update credit_packages set credits = 91, description = '≈ 30 ekonomik veya 6 standart (15 sn) video'
where id = 'ultra';
update credit_packages set credits = 143, description = '≈ 47 ekonomik veya 9 standart (15 sn) video'
where id = 'max';

update premium_plans set credits = 27, features = E'Sınırsız yaratıcılık\nSinematik AI efektleri\nGelişmiş AI düzenleme\nHaftada 27 kredi'
where id = 'weekly';
update premium_plans set credits = 88, features = E'Sınırsız yaratıcılık\nSinematik AI efektleri\nGelişmiş AI düzenleme\nAyda 88 kredi'
where id = 'monthly';
update premium_plans set credits = 409, features = E'Sınırsız yaratıcılık\nSinematik AI efektleri\nGelişmiş AI düzenleme\n6 ay boyunca kredi'
where id = 'sixmo';
update premium_plans set credits = 700, features = E'Sınırsız yaratıcılık\nSinematik AI efektleri\nGelişmiş AI düzenleme\nYıllık kredi paketi'
where id = 'yearly';

insert into app_settings (key, value) values
  ('credit_per_usd', '7'),
  ('welcome_credits', '3'),
  ('credit_scale_version', 'cpu7')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Idempotent wallet conversion: ceil(old * 7 / 48). Unique (job_id, kind) blocks a second pass.
with src as (
  select w.user_id, w.balance as old_balance,
         case when w.balance <= 0 then 0 else greatest(1, ceil(w.balance::numeric * 7 / 48)::int) end as new_balance
  from credit_wallets w
  where not exists (
    select 1 from credit_ledger l
    where l.user_id = w.user_id
      and l.kind = 'olcek_donusum'
      and l.job_id = 'olcek:cpu7:' || w.user_id
  )
),
upd as (
  update credit_wallets w
  set balance = s.new_balance
  from src s
  where w.user_id = s.user_id
    and w.balance is distinct from s.new_balance
  returning w.user_id, s.old_balance, s.new_balance
),
marked as (
  insert into credit_ledger (id, user_id, amount, kind, job_id, note)
  select
    'olcek-cpu7-' || s.user_id,
    s.user_id,
    coalesce(u.new_balance, s.new_balance) - s.old_balance,
    'olcek_donusum',
    'olcek:cpu7:' || s.user_id,
    'Kredi ölçeği güncellendi; video 
... 