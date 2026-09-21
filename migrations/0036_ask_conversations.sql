-- Active ZUNOZA'ya Sor conversation (written + live share one thread).
-- Attachments are user-scoped; downloads must check user_id.

create table if not exists ask_conversations (
  id text primary key,
  user_id text not null unique,
  messages_json text not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ask_conversations_updated_idx on ask_conversations (updated_at desc);

create table if not exists ask_attachments (
  id text primary key,
  conversation_id text not null references ask_conversations(id) on delete cascade,
  user_id text not null,
  mime_type text not null,
  byte_size integer,
  object_key text not null,
  created_at timestamptz not null default now()
);
create index if not exists ask_attachments_user_idx on ask_attachments (user_id, created_at desc);
create index if not exists ask_attachments_conv_idx on ask_attachments (conversation_id, created_at desc);
