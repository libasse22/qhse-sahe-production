-- ============================================================================
-- Migration 0030 : Preuves terrain (Avant/Pendant/Après) & Inspections checklists
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Types énumérés -------------------------------------------------------------
do $$ begin
  create type public.proof_stage as enum ('avant', 'pendant', 'apres');
exception
  when duplicate_object then null;
end $$;

-- 2. Table situation_proofs (Preuves Terrain) -----------------------------------
create table if not exists public.situation_proofs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  incident_id uuid references public.incidents(id) on delete cascade,
  action_id uuid references public.actions_correctives(id) on delete set null,
  stage public.proof_stage not null default 'apres',
  storage_path text not null,
  caption text default '',
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

comment on table public.situation_proofs is 'Métadonnées des preuves photographiques terrain par stade (avant, pendant, après).';

alter table public.situation_proofs enable row level security;

-- 3. Table inspection_templates (Modèles de Checklists) -------------------------
create table if not exists public.inspection_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  title text not null,
  category text not null default 'generale',
  description text default '',
  items jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.inspection_templates is 'Modèles de checklists réutilisables pour les inspections terrain.';

alter table public.inspection_templates enable row level security;

-- 4. Table inspection_runs (Inspections réalisées) -----------------------------
create table if not exists public.inspection_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  template_id uuid references public.inspection_templates(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  inspector_id uuid not null references public.profiles(id),
  title text not null,
  status text not null default 'terminee',
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.inspection_runs is 'Rapports des inspections terrain exécutées avec leurs réponses et constats.';

alter table public.inspection_runs enable row level security;

-- 5. Triggers set_company_id() --------------------------------------------------
drop trigger if exists trg_set_company_id_situation_proofs on public.situation_proofs;
create trigger trg_set_company_id_situation_proofs
  before insert on public.situation_proofs
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_inspection_templates on public.inspection_templates;
create trigger trg_set_company_id_inspection_templates
  before insert on public.inspection_templates
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_inspection_runs on public.inspection_runs;
create trigger trg_set_company_id_inspection_runs
  before insert on public.inspection_runs
  for each row execute function public.set_company_id();

-- 6. Index ----------------------------------------------------------------------
create index if not exists situation_proofs_company_id_idx on public.situation_proofs(company_id);
create index if not exists situation_proofs_incident_id_idx on public.situation_proofs(incident_id);
create index if not exists situation_proofs_action_id_idx on public.situation_proofs(action_id);

create index if not exists inspection_templates_company_id_idx on public.inspection_templates(company_id);
create index if not exists inspection_runs_company_id_idx on public.inspection_runs(company_id);
create index if not exists inspection_runs_inspector_id_idx on public.inspection_runs(inspector_id);
create index if not exists inspection_runs_template_id_idx on public.inspection_runs(template_id);

-- 7. RLS Policies Multi-Tenant --------------------------------------------------

-- situation_proofs
drop policy if exists situation_proofs_select_multi_company on public.situation_proofs;
create policy situation_proofs_select_multi_company
  on public.situation_proofs for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists situation_proofs_insert_multi_company on public.situation_proofs;
create policy situation_proofs_insert_multi_company
  on public.situation_proofs for insert
  with check (
    (company_id is null or company_id = public.current_company_id())
    and uploaded_by = auth.uid()
  );

drop policy if exists situation_proofs_delete_multi_company on public.situation_proofs;
create policy situation_proofs_delete_multi_company
  on public.situation_proofs for delete
  using (
    company_id = public.current_company_id()
    and (uploaded_by = auth.uid() or public.has_permission('incidents.manage_all'))
  );

-- inspection_templates
drop policy if exists inspection_templates_select_multi_company on public.inspection_templates;
create policy inspection_templates_select_multi_company
  on public.inspection_templates for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists inspection_templates_write_multi_company on public.inspection_templates;
create policy inspection_templates_write_multi_company
  on public.inspection_templates for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('audits.manage')
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
    and public.has_permission('audits.manage')
  );

-- inspection_runs
drop policy if exists inspection_runs_select_multi_company on public.inspection_runs;
create policy inspection_runs_select_multi_company
  on public.inspection_runs for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists inspection_runs_insert_multi_company on public.inspection_runs;
create policy inspection_runs_insert_multi_company
  on public.inspection_runs for insert
  with check (
    (company_id is null or company_id = public.current_company_id())
    and inspector_id = auth.uid()
  );

drop policy if exists inspection_runs_delete_multi_company on public.inspection_runs;
create policy inspection_runs_delete_multi_company
  on public.inspection_runs for delete
  using (
    company_id = public.current_company_id()
    and (inspector_id = auth.uid() or public.has_permission('audits.manage'))
  );
