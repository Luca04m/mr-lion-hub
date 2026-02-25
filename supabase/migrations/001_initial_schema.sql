-- ============================================
-- MR. LION HUB - Initial Database Schema
-- ============================================

-- Tasks
create table if not exists tasks (
  id bigint primary key,
  title text not null,
  detail text not null default '',
  responsible text[] not null default '{}',
  priority text not null default 'media',
  area text not null default 'Operacional',
  status text not null default 'pendente',
  dependencies bigint[] not null default '{}',
  decision text,
  notes text not null default '',
  due_date text,
  created_by text not null,
  is_original boolean not null default false,
  tags text[] not null default '{}',
  attachments jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Activities (audit log)
create table if not exists activities (
  id bigint primary key,
  task_id bigint,
  task_title text not null,
  user_name text not null,
  action text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

-- Meetings
create table if not exists meetings (
  id bigint primary key,
  title text not null,
  meeting_date text not null,
  file_type text not null default 'pauta',
  file_name text not null default '',
  file_url text not null default '',
  uploaded_by text not null,
  notes text not null default '',
  hora text not null default '',
  tipo text not null default 'Pontual',
  participantes text[] not null default '{}',
  local text not null default '',
  meeting_status text not null default 'Agendada',
  created_at timestamptz not null default now()
);

-- CRM Revendedores
create table if not exists revendedores (
  id text primary key,
  nome text not null,
  responsavel text not null,
  status text not null default 'Novo Lead',
  canal text not null default 'WhatsApp',
  cidade text not null default '',
  volume integer not null default 0,
  ultima text not null default '',
  obs text not null default '',
  whatsapp text not null default '',
  instagram text not null default '',
  email text not null default '',
  telefone text not null default '',
  tags text[] not null default '{}',
  score integer not null default 0,
  proxima_acao jsonb,
  volume_historico jsonb not null default '[]',
  historico jsonb not null default '[]'
);

-- Business KPIs
create table if not exists business_kpis (
  id text primary key default 'default',
  meta_mensal numeric not null default 1600,
  realizado numeric not null default 619,
  receita_estimada numeric not null default 95175,
  ticket_medio numeric not null default 213,
  custo_entrega numeric not null default 18.17
);

-- Presence (for online users)
create table if not exists presence (
  name text primary key,
  last_seen timestamptz not null default now()
);

-- Sequence counter for IDs
create table if not exists id_counter (
  key text primary key default 'main',
  value bigint not null default 31000
);

-- Insert default counter
insert into id_counter (key, value) values ('main', 31000) on conflict do nothing;

-- Insert default KPIs
insert into business_kpis (id) values ('default') on conflict do nothing;

-- ============================================
-- Row Level Security (RLS)
-- All tables are public-access since the app
-- uses a shared password, not per-user auth.
-- ============================================
alter table tasks enable row level security;
alter table activities enable row level security;
alter table meetings enable row level security;
alter table revendedores enable row level security;
alter table business_kpis enable row level security;
alter table presence enable row level security;
alter table id_counter enable row level security;

-- Allow all operations for anon role (shared password app)
create policy "Allow all for anon" on tasks for all using (true) with check (true);
create policy "Allow all for anon" on activities for all using (true) with check (true);
create policy "Allow all for anon" on meetings for all using (true) with check (true);
create policy "Allow all for anon" on revendedores for all using (true) with check (true);
create policy "Allow all for anon" on business_kpis for all using (true) with check (true);
create policy "Allow all for anon" on presence for all using (true) with check (true);
create policy "Allow all for anon" on id_counter for all using (true) with check (true);

-- ============================================
-- Realtime
-- ============================================
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table activities;
alter publication supabase_realtime add table meetings;
alter publication supabase_realtime add table revendedores;
alter publication supabase_realtime add table presence;
alter publication supabase_realtime add table business_kpis;

-- ============================================
-- Storage bucket for file attachments
-- ============================================
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict do nothing;

create policy "Allow public upload" on storage.objects
  for insert with check (bucket_id = 'attachments');

create policy "Allow public read" on storage.objects
  for select using (bucket_id = 'attachments');

create policy "Allow public delete" on storage.objects
  for delete using (bucket_id = 'attachments');

-- ============================================
-- Function to get next ID atomically
-- ============================================
create or replace function get_next_id()
returns bigint
language plpgsql
as $$
declare
  next_val bigint;
begin
  update id_counter set value = value + 1 where key = 'main' returning value into next_val;
  return next_val;
end;
$$;
