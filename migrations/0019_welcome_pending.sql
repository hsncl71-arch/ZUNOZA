alter table zunoza_profiles
  add column if not exists welcome_pending boolean not null default false;
