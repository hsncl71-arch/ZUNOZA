-- Optional iyzico/6502 identity fields. Empty by default. No invented values.

alter table legal_company add column if not exists entity_type text not null default '';
alter table legal_company add column if not exists registry_no text not null default '';
alter table legal_company add column if not exists chamber_no text not null default '';
