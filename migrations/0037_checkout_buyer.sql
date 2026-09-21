-- Saved checkout identity for returning buyers. Never invent dummy TCKN/GSM.
-- Used only for iyzico Checkout Form initialize; erased with the profile.

alter table zunoza_profiles add column if not exists checkout_identity_number text;
alter table zunoza_profiles add column if not exists checkout_gsm text;
alter table zunoza_profiles add column if not exists checkout_city text;
