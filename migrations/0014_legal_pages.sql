create table if not exists legal_company (
  id text primary key,
  trade_name text not null default '',
  address text not null default '',
  tax_office text not null default '',
  tax_no text not null default '',
  email text not null default '',
  phone text not null default '',
  updated_at timestamptz not null default now()
);

insert into legal_company (id) values ('default')
on conflict (id) do nothing;

create table if not exists legal_pages (
  slug text primary key,
  title text not null,
  body text not null default '',
  updated_at timestamptz not null default now()
);

insert into legal_pages (slug, title, body) values
  ('hakkimizda', 'Hakkımızda', ''),
  ('iletisim', 'İletişim', ''),
  ('gizlilik', 'Gizlilik Politikası', ''),
  ('mesafeli-satis', 'Mesafeli Satış Sözleşmesi', ''),
  ('teslimat-iade', 'Teslimat ve İade Şartları', '')
on conflict (slug) do nothing;
