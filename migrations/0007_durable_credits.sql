-- Production durability: one welcome credit per user, isolation indexes.
-- Media files stay on R2; only metadata/object refs live in the database.

delete from credit_ledger a
using credit_ledger b
where a.kind = 'hosgeldin'
  and b.kind = 'hosgeldin'
  and a.user_id = b.user_id
  and (
    a.created_at > b.created_at
    or (a.created_at = b.created_at and a.id > b.id)
  );

create unique index if not exists credit_ledger_welcome_user_idx
  on credit_ledger (user_id)
  where kind = 'hosgeldin';

create index if not exists storyboard_projects_user_idx
  on storyboard_projects (user_id, created_at desc);

create index if not exists video_jobs_storyboard_idx
  on video_jobs (storyboard_id, scene_index);

create index if not exists credit_ledger_user_kind_idx
  on credit_ledger (user_id, kind);
