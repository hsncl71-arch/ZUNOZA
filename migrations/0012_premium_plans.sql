create table if not exists premium_plans (
  id text primary key,
  name text not null,
  price_try numeric(12,2) not null,
  period_label text not null,
  duration_days integer not null,
  credits integer not null default 0,
  badge text not null default '',
  description text not null default '',
  features text not null default '',
  intro_price_try numeric(12,2),
  intro_note text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into premium_plans (
  id, name, price_try, period_label, duration_days, credits, badge, description, features, intro_price_try, intro_note, active, sort_order
) values
  (
    'weekly',
    'Haftalık',
    499.99,
    '/hafta',
    7,
    150,
    'POPÜLER',
    'Kısa dönem Premium erişim',
    E'Sınırsız yaratıcılık\nSinematik AI efektleri\nGelişmiş AI düzenleme',
    499.99,
    '',
    true,
    1
  ),
  (
    'monthly',
    'Aylık',
    1499.99,
    '/ay',
    30,
    600,
    '',
    'Aylık Premium erişim',
    E'Sınırsız yaratıcılık\nSinematik AI efektleri\nGelişmiş AI düzenleme\nAyda 600 kredi',
    null,
    '',
    true,
    2
  ),
  (
    'sixmo',
    '6 Aylık',
    6999.99,
    '/6 ay',
    180,
    3600,
    'EN AVANTAJLI',
    'Uzun dönem Premium erişim',
    E'Sınırsız yaratıcılık\nSinematik AI efektleri\nGelişmiş AI düzenleme\n6 ay boyunca kredi',
    null,
    '',
    true,
    3
  ),
  (
    'yearly',
    '1 Yıllık',
    11999.99,
    '/yıl',
    365,
    7200,
    '',
    'Yıllık Premium erişim',
    E'Sınırsız yaratıcılık\nSinematik AI efektleri\nGelişmiş AI düzenleme\nYıllık kredi paketi',
    null,
    '',
    true,
    4
  )
on conflict (id) do nothing;
