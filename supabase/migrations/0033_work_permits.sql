-- ============================================================================
-- Migration 0033 : Permis de Travail / Control of Work (PtW)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Types énumérés -------------------------------------------------------------
do $$ begin
  create type public.work_permit_type as enum (
    'hauteur',
    'point_chaud',
    'espace_confine',
    'electrique',
    'fouille',
    'chimique',
    'autre'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.work_permit_status as enum (
    'brouillon',
    'en_attente',
    'approuve',
    'refuse',
    'en_cours',
    'cloture',
    'annule'
  );
exception
  when duplicate_object then null;
end $$;

-- 2. Table work_permits ---------------------------------------------------------
create table if not exists public.work_permits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  reference text not null,
  permit_type public.work_permit_type not null default 'autre',
  title text not null,
  description text not null default '',
  location text not null default '',
  site_id uuid references public.sites(id) on delete set null,
  applicant_id uuid not null references public.profiles(id),
  approver_id uuid references public.profiles(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  safety_measures jsonb not null default '[]'::jsonb,
  status public.work_permit_status not null default 'brouillon',
  rejection_reason text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.work_permits is 'Permis de travail autorisant les interventions à risques (hauteur, point chaud, consignation).';

alter table public.work_permits enable row level security;

-- 3. Trigger set_company_id() --------------------------------------------------
drop trigger if exists trg_set_company_id_work_permits on public.work_permits;
create trigger trg_set_company_id_work_permits
  before insert on public.work_permits
  for each row execute function public.set_company_id();

-- 4. Indexation -----------------------------------------------------------------
create index if not exists work_permits_company_id_idx on public.work_permits(company_id);
create index if not exists work_permits_applicant_id_idx on public.work_permits(applicant_id);
create index if not exists work_permits_status_idx on public.work_permits(status);
create index if not exists work_permits_permit_type_idx on public.work_permits(permit_type);

-- 5. RLS Policies Multi-Tenant --------------------------------------------------
drop policy if exists work_permits_select_multi_company on public.work_permits;
create policy work_permits_select_multi_company
  on public.work_permits for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists work_permits_insert_multi_company on public.work_permits;
create policy work_permits_insert_multi_company
  on public.work_permits for insert
  with check (
    (company_id is null or company_id = public.current_company_id())
    and applicant_id = auth.uid()
  );

drop policy if exists work_permits_update_multi_company on public.work_permits;
create policy work_permits_update_multi_company
  on public.work_permits for update
  using (
    company_id = public.current_company_id()
    and (applicant_id = auth.uid() or public.has_permission('actions.manage') or public.is_qhse_or_admin())
  )
  with check (
    company_id = public.current_company_id()
  );

drop policy if exists work_permits_delete_multi_company on public.work_permits;
create policy work_permits_delete_multi_company
  on public.work_permits for delete
  using (
    company_id = public.current_company_id()
    and (applicant_id = auth.uid() or public.has_permission('actions.manage') or public.is_qhse_or_admin())
  );
