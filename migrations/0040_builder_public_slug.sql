alter table builder_projects add column if not exists public_slug text;
create unique index if not exists builder_projects_public_slug_idx
  on builder_projects (public_slug) where public_slug is not null;
