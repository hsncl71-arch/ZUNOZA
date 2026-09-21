-- Profit buffer: charge credits from API+storage at 48 credits/USD.
-- List prices unchanged. iyzico %3 remains a pricing assumption.

insert into pricing_rules (duration_seconds, quality, credits) values
  (5, 'ekonomik', 20), (5, 'standart', 35), (5, 'hd', 40), (5, 'ultra', 61),
  (10, 'ekonomik', 39), (10, 'standart', 68), (10, 'hd', 78), (10, 'ultra', 121),
  (15, 'ekonomik', 59), (15, 'standart', 102), (15, 'hd', 117), (15, 'ultra', 181),
  (30, 'ekonomik', 118), (30, 'standart', 204), (30, 'hd', 234), (30, 'ultra', 362)
on conflict (duration_seconds, quality) do update set credits = excluded.credits;

insert into feature_credit_rules (feature, credits) values
  ('image_generate_1k', 2),
  ('image_generate_2k', 3),
  ('image_edit_1k', 3),
  ('image_edit_2k', 4),
  ('music_15', 2),
  ('music_30', 4),
  ('music_45', 6),
  ('voice_song_15', 20),
  ('voice_song_30', 21),
  ('voice_song_45', 23),
  ('tts_base', 1),
  ('assistant_chat', 1),
  ('assistant_web', 2),
  ('assistant_speak', 1),
  ('lyrics', 1),
  ('voice_live', 39),
  ('builder_create', 8),
  ('builder_edit', 4),
  ('builder_repair', 3),
  ('builder_publish', 0),
  ('montage_per_15s', 5),
  ('video_i2v_surcharge', 1)
on conflict (feature) do update set credits = excluded.credits, updated_at = now();

insert into app_settings (key, value) values
  ('credit_per_usd', '48'),
  ('iyzico_assumption_pct', '3')
on conflict (key) do update set value = excluded.value, updated_at = now();
