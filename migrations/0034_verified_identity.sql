-- Verified tax-plate identity (Gelir İdaresi, 14.09.2026).
-- Esnaf / yıllık gelir vergisi. Do not invent MERSİS, KEP, VKN, e-posta or phone.
-- Muğla oda/sicil is stored as document data with chamber_status=needs_review
-- and must not be shown to customers as the current chamber for the Kırıkkale address.

alter table legal_company add column if not exists shop_title text not null default '';
alter table legal_company add column if not exists activity_code text not null default '';
alter table legal_company add column if not exists activity_name text not null default '';
alter table legal_company add column if not exists work_start text not null default '';
alter table legal_company add column if not exists chamber_status text not null default '';
alter table legal_company add column if not exists tax_kind text not null default '';

update legal_company
set
  trade_name = 'HASAN ÖCAL',
  shop_title = 'ÖZ ÖCAL TESBİHÇİLİK',
  brand_name = case when btrim(coalesce(brand_name, '')) = '' then 'ZUNOZA' else brand_name end,
  address = 'YENİŞEHİR MAH. KAZIM KARABEKİR CAD. YAŞAM APT. NO: 39 İÇ KAPI NO: 1 YAHŞİHAN / KIRIKKALE',
  tax_office = 'IRMAK VERGİ DAİRESİ MÜDÜRLÜĞÜ',
  tax_kind = 'Yıllık gelir vergisi',
  entity_type = 'esnaf',
  activity_code = '479114',
  activity_name = 'Radyo, televizyon, posta yoluyla veya internet üzerinden yapılan perakende ticaret',
  work_start = '06/05/2022',
  registry_no = '141414',
  chamber_no = '7050',
  chamber = 'MUĞLA ESNAF VE SANATKÂRLAR ODALARI BİRLİĞİ',
  chamber_status = 'needs_review',
  kvkk_contact_name = case when btrim(coalesce(kvkk_contact_name, '')) = '' then 'HASAN ÖCAL' else kvkk_contact_name end,
  updated_at = now()
where id = 'default';
