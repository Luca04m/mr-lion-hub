-- ============================================
-- MR. LION HUB - Campaigns Feature
-- Migration 002
-- ============================================

-- Campaigns table
create table if not exists campaigns (
  id          bigint primary key,
  title       text   not null,
  concept     text   not null default '',
  tagline     text   not null default '',
  product     text   not null default '',
  status      text   not null default 'rascunho'
              check (status in ('rascunho', 'ativa', 'pausada', 'encerrada')),
  start_date  text   not null default '',
  end_date    text   not null default '',
  channels    jsonb  not null default '[]',
  phases      jsonb  not null default '[]',
  angles      jsonb  not null default '[]',
  notes       text   not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Add campanha_id to tasks
alter table tasks
  add column if not exists campanha_id bigint
  references campaigns(id) on delete set null;

-- Add campanha_id to content_posts (if table exists)
-- Note: content_posts is currently localStorage-only.
-- Uncomment when content_posts is migrated to Supabase:
-- alter table content_posts
--   add column if not exists campanha_id bigint
--   references campaigns(id) on delete set null;

-- Indexes for FK lookups
create index if not exists idx_tasks_campanha_id
  on tasks(campanha_id) where campanha_id is not null;

-- RLS
alter table campaigns enable row level security;

create policy "Allow all for anon" on campaigns
  for all using (true) with check (true);

-- Realtime
alter publication supabase_realtime add table campaigns;
