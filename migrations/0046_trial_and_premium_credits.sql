-- Welcome trial: 10 credits. Premium display credits raised per product request.
-- Extra credit SKUs (Mini/Plus/Pro) and per-job consumption are NOT changed here.

insert into app_settings (key, value) values
  ('welcome_credits', '10')
on conflict (key) do update set value = excluded.value, updated_at = now();

update premium_plans set credits = 300, features = E'Sınırsız yaratıcılık\nSinematik AI efektleri\nGelişmiş AI düzenleme\nHaftada 300 kredi'
where id = 'weekly';
update premium_plans set credits = 600, features = E'Sınırsız yaratıcılık\nSinematik AI efektleri\nGelişmiş AI düzenleme\nAyda 600 kredi'
where id = 'monthly';
update premium_plans set credits = 4000, features = E'Sınırsız yaratıcılık\nSinematik AI efektleri\nGelişmiş AI düzenleme\n6 ay boyunca 4000 kredi'
where id = 'sixmo';
update premium_plans set credits = 7200, features = E'Sınırsız yaratıcılık\nSinematik AI efektleri\nGelişmiş AI düzenleme\nYıllık 7200 kredi'
where id = 'yearly';
