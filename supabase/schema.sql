-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Helper function: current_user_id
create or replace function public.current_user_id()
returns uuid language sql stable as $$
  select auth.uid();
$$;

-- Tables
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz default now()
);

create table if not exists public.users (
  id uuid primary key,
  email text not null unique,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  created_at timestamptz default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  tags text,
  created_at timestamptz default now()
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  value int default 0,
  stage text not null check (stage in ('novo','qualificado','proposta','ganho')) default 'novo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  storage_path text not null,
  created_at timestamptz default now()
);

create table if not exists public.agent_catalog (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  default_enabled boolean not null default true,
  default_model text not null default 'gpt-5',
  default_params jsonb,
  system_prompt text,
  created_at timestamptz default now()
);

create table if not exists public.agent_overrides (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  agent_key text not null,
  enabled boolean,
  model text,
  temperature int,
  max_tokens int,
  system_prompt text,
  created_at timestamptz default now()
);

create table if not exists public.agent_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  enabled boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  agent_key text not null,
  client_id uuid references public.clients(id) on delete set null,
  input_summary text,
  status text not null check (status in ('queued','running','done','error')) default 'queued',
  output_path text,
  created_at timestamptz default now(),
  finished_at timestamptz
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('lead','member')),
  created_at timestamptz default now()
);

create table if not exists public.team_agent_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  agent_key text not null,
  enabled boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  meta jsonb,
  created_at timestamptz default now()
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  period text not null,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  cost_cents int not null default 0,
  created_at timestamptz default now()
);

-- Helper RPC: increment usage counters
create or replace function public.increment_usage_counters(
  p_org_id uuid,
  p_period text,
  p_tokens_in int,
  p_tokens_out int,
  p_cost_cents int
) returns void
language plpgsql
security definer
as $$
begin
  insert into public.usage_counters (org_id, period, tokens_in, tokens_out, cost_cents)
  values (p_org_id, p_period, p_tokens_in, p_tokens_out, p_cost_cents)
  on conflict (org_id, period) do update set
    tokens_in = public.usage_counters.tokens_in + excluded.tokens_in,
    tokens_out = public.usage_counters.tokens_out + excluded.tokens_out,
    cost_cents = public.usage_counters.cost_cents + excluded.cost_cents;
end;
$$;

-- RLS enable
alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.memberships enable row level security;
alter table public.clients enable row level security;
alter table public.deals enable row level security;
alter table public.notes enable row level security;
alter table public.files enable row level security;
alter table public.agent_catalog enable row level security;
alter table public.agent_overrides enable row level security;
alter table public.agent_settings enable row level security;
alter table public.agent_runs enable row level security;
alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.team_agent_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.usage_counters enable row level security;

-- Policies
-- Users table: allow users to see themselves
create policy if not exists users_select_self on public.users for select
  using (id = auth.uid());
create policy if not exists users_insert_self on public.users for insert
  with check (id = auth.uid());
create policy if not exists users_update_self on public.users for update
  using (id = auth.uid());

-- Organizations listing only via memberships
create policy if not exists orgs_member_select on public.organizations for select
  using (exists(select 1 from public.memberships m where m.org_id = id and m.user_id = auth.uid()));

-- Memberships: user can see their memberships
create policy if not exists memberships_select on public.memberships for select
  using (user_id = auth.uid());

-- Generic org-based policy helper
-- For all tables with org_id, allow access if user is member of org
do $$
declare r record;
begin
  for r in select table_name from information_schema.columns where table_schema='public' and column_name='org_id' loop
    execute format('create policy if not exists %I_org_member_select on public.%I for select using (exists(select 1 from public.memberships m where m.org_id = org_id and m.user_id = auth.uid()));', r.table_name, r.table_name);
    execute format('create policy if not exists %I_org_member_insert on public.%I for insert with check (exists(select 1 from public.memberships m where m.org_id = org_id and m.user_id = auth.uid()));', r.table_name, r.table_name);
    execute format('create policy if not exists %I_org_member_update on public.%I for update using (exists(select 1 from public.memberships m where m.org_id = org_id and m.user_id = auth.uid()));', r.table_name, r.table_name);
    execute format('create policy if not exists %I_org_member_delete on public.%I for delete using (exists(select 1 from public.memberships m where m.org_id = org_id and m.user_id = auth.uid()));', r.table_name, r.table_name);
  end loop;
end $$;

-- agent_catalog can be public read
create policy if not exists agent_catalog_public_read on public.agent_catalog for select using (true);

-- Seeds demo
insert into public.organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Demo Law', 'demo-law')
on conflict (id) do nothing;

insert into public.users (id, email, full_name)
values ('00000000-0000-0000-0000-0000000000aa', 'owner@demo.law', 'Owner Demo')
on conflict (id) do nothing;

insert into public.memberships (org_id, user_id, role)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000aa', 'owner')
on conflict do nothing;

-- STORAGE: bucket outputs (público)
insert into storage.buckets (id, name, public)
values ('outputs', 'outputs', true)
on conflict (id) do nothing;

-- STORAGE policies: leitura pública em outputs
create policy if not exists "Public read outputs"
on storage.objects for select
using (bucket_id = 'outputs');

-- clients
insert into public.clients (org_id, name, email, phone, tags)
values 
('00000000-0000-0000-0000-000000000001','Cliente A','a@demo.law','+55 11 99999-0001','vip,tributario'),
('00000000-0000-0000-0000-000000000001','Cliente B','b@demo.law','+55 11 99999-0002','trabalhista'),
('00000000-0000-0000-0000-000000000001','Cliente C','c@demo.law','+55 11 99999-0003','civel')
on conflict do nothing;

-- deals
insert into public.deals (org_id, title, value, stage)
values 
('00000000-0000-0000-0000-000000000001','Proposta A', 5000, 'novo'),
('00000000-0000-0000-0000-000000000001','Proposta B', 12000, 'qualificado'),
('00000000-0000-0000-0000-000000000001','Proposta C', 30000, 'proposta')
on conflict do nothing;

-- agent catalog
insert into public.agent_catalog (key,name,default_enabled,default_model,default_params,system_prompt) values
('prazos','Prazos', true,'gpt-5', '{"temperature":0.1}', 'Extraia numero_processo, partes, tipo_ato, prazo_dias_uteis, data_publicacao (YYYY-MM-DD), prazo_final_estimado (YYYY-MM-DD), checklist[]. Retorne JSON válido.'),
('pesquisa','Pesquisa', true,'gpt-5', '{"temperature":0.1}', 'Relatório de jurisprudência (últimos 12 meses): ementa, nº, data, link oficial, fundamentos, divergências. Formato: Markdown.'),
('peca','Peça', true,'gpt-5', '{"temperature":0.1}', 'Minuta de peça com Fatos, Fundamentos (com referências), Pedidos, Anexos e “Pontos para validação humana”. Formato: Markdown.'),
('contrato','Contrato', true,'gpt-5', '{"temperature":0.1}', 'Comparação entre versões; listar mudanças, classificar risco (alto/médio/baixo), sugerir redações; incluir “Matriz de Risco” tabelada. Formato: Markdown.'),
('traducao','Tradução', true,'gpt-5', '{"temperature":0.1}', 'Explicar documento para leigo, com precisão e próximos passos, sem prometer resultado. Formato: Markdown.'),
('evidencias','Evidências', true,'gpt-5', '{"temperature":0.1}', 'Identificar dados sensíveis (CPF, RG, endereço, dados médicos); checklist de redaction + roteiro de custódia (Bates). Formato: Markdown.'),
('audiencia','Audiência', true,'gpt-5', '{"temperature":0.1}', 'Resumo estratégico (forças x fraquezas), 10 perguntas prováveis e respostas sugeridas. Formato: Markdown.')
on conflict do nothing;

-- fake run
insert into public.agent_runs (org_id, agent_key, input_summary, status, output_path)
values ('00000000-0000-0000-0000-000000000001','pesquisa','Query demo','done','demo-org/pesquisa/2025-01-01_demo.md')
on conflict do nothing;

