-- ============================================================================
-- Migration 0037 : Extension Permis de Travail 2.0 (PtW)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Ajout des nouveaux types de permis (levage, consignation LOTO) -------------
do $$ begin
  alter type public.work_permit_type add value if not exists 'levage';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter type public.work_permit_type add value if not exists 'consignation_loto';
exception
  when duplicate_object then null;
end $$;

-- 2. Champs étendus sur work_permits -------------------------------------------
alter table public.work_permits
  add column if not exists contractor_company text default '',
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text default '',
  add column if not exists required_qualifications jsonb default '[]'::jsonb;

-- 3. Table work_permit_workers (Équipe d'intervenants) -----------------------
create table if not exists public.work_permit_workers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  work_permit_id uuid not null references public.work_permits(id) on delete cascade,
  worker_id uuid references public.profiles(id) on delete set null,
  worker_name text not null,
  role_or_qualification text default '',
  created_at timestamptz not null default now()
);

comment on table public.work_permit_workers is 'Registre des intervenants et sous-traitants autorisés sur un permis de travail.';

alter table public.work_permit_workers enable row level security;

-- 4. Trigger set_company_id() --------------------------------------------------
drop trigger if exists trg_set_company_id_work_permit_workers on public.work_permit_workers;
create trigger trg_set_company_id_work_permit_workers
  before insert on public.work_permit_workers
  for each row execute function public.set_company_id();

-- 5. Index & RLS Policies -------------------------------------------------------
create index if not exists work_permit_workers_permit_id_idx on public.work_permit_workers(work_permit_id);
create index if not exists work_permit_workers_company_id_idx on public.work_permit_workers(company_id);

drop policy if exists work_permit_workers_select_multi_company on public.work_permit_workers;
create policy work_permit_workers_select_multi_company
  on public.work_permit_workers for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists work_permit_workers_write_multi_company on public.work_permit_workers;
create policy work_permit_workers_write_multi_company
  on public.work_permit_workers for all
  using (
    company_id = public.current_company_id()
    and (public.has_permission('actions.manage') or public.is_qhse_or_admin())
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
  );
