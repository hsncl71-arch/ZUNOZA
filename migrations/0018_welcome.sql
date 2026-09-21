alter table zunoza_profiles
  add column if not exists welcome_seen_at timestamptz;
