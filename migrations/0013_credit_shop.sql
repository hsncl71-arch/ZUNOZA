alter table credit_packages add column if not exists badge text not null default '';
alter table credit_packages add column if not exists discount_pct integer not null default 0;
alter table credit_packages add column if not exists active boolean not null default true;
alter table credit_packages add column if not exists description text not null default '';

create table if not exists credit_shop_campaign (
  id text primary key,
  title text not null default '',
  body text not null default '',
  badge text not null default '',
  active boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into credit_shop_campaign (id, title, body, badge, active) values
  ('default', 'ZUNOZA kredi yükle', 'Paketleri yönetici panelinden düzenleyebilirsiniz.', 'KAMPANYA', true)
on conflict (id) do nothing;

insert into credit_packages (id, name, credits, price_try, popular, contact_only, sort_order, badge, discount_pct, active, description) values
  ('mini', 'Mini', 100, 99, false, false, 1, '', 0, true, 'Hızlı başlangıç kredisi'),
  ('ultra', 'Ultra', 2500, 1499, false, false, 5, 'EN AVANTAJLI', 0, true, 'Yoğun üretim için'),
  ('max', 'Max', 5000, 2499, false, false, 6, '', 0, true, 'En yüksek kredi paketi')
on conflict (id) do nothing;

update credit_packages set name = 'Başlangıç', credits = 300, price_try = 249, popular = false, contact_only = false, sort_order = 2, badge = '', discount_pct = 0, active = true, description = 'Düzenli üretim için'
where id = 'baslangic';

update credit_packages set name = 'Plus', credits = 500, price_try = 399, popular = true, contact_only = false, sort_order = 3, badge = 'EN POPÜLER', discount_pct = 0, active = true, description = 'En çok tercih edilen paket'
where id = 'plus';

update credit_packages set name = 'Pro', credits = 1000, price_try = 699, popular = false, contact_only = false, sort_order = 4, badge = '', discount_pct = 0, active = true, description = 'Profesyonel üretim'
where id = 'pro';

update credit_packages set active = false, sort_order = 90
where id = 'isletme';
