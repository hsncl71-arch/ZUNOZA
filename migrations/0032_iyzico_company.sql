-- iyzico merchant website review: homepage İletişim fields.
-- Empty strings only. Do not invent MERSİS / KEP / oda identity.

alter table legal_company add column if not exists mersis text not null default '';
alter table legal_company add column if not exists kep text not null default '';
alter table legal_company add column if not exists brand_name text not null default '';
alter table legal_company add column if not exists chamber text not null default '';
alter table legal_company add column if not exists chamber_rules text not null default '';
