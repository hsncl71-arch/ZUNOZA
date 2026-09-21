insert into legal_pages (slug, title, body) values
  ('kvkk-aydinlatma', 'KVKK Aydınlatma Metni', ''),
  ('kullanim-kosullari', 'Kullanım Koşulları', ''),
  ('on-bilgilendirme', 'Ön Bilgilendirme Formu', '')
on conflict (slug) do nothing;
