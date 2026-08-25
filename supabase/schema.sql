-- ============================================================
-- Clientany — esquema de base de datos (Supabase / Postgres)
-- Ejecutá esto en Supabase → SQL Editor → New query → Run.
-- ============================================================

-- Un "workspace" por usuario: guarda todo su CRM como JSON.
-- (MVP simple y robusto; luego se puede normalizar en tablas por entidad.)
create table if not exists public.workspaces (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Seguridad a nivel de fila: cada usuario solo ve/edita SU workspace.
alter table public.workspaces enable row level security;

drop policy if exists "workspace_select_own" on public.workspaces;
create policy "workspace_select_own" on public.workspaces
  for select using (auth.uid() = user_id);

drop policy if exists "workspace_insert_own" on public.workspaces;
create policy "workspace_insert_own" on public.workspaces
  for insert with check (auth.uid() = user_id);

drop policy if exists "workspace_update_own" on public.workspaces;
create policy "workspace_update_own" on public.workspaces
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "workspace_delete_own" on public.workspaces;
create policy "workspace_delete_own" on public.workspaces
  for delete using (auth.uid() = user_id);
