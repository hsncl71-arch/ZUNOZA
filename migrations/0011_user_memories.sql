create table if not exists user_memories (
  id text primary key,
  user_id text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_memories_user_idx on user_memories (user_id, created_at desc);
