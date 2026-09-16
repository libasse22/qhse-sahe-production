-- ============================================================================
-- Migration 0050 : Signatures & Accusés Individuels PtW (Phase I)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Table work_permit_signatures (Chaîne de Signatures par Permis) -------------
create table if not exists public.work_permit_signatures (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  work_permit_id uuid not null references public.work_permits(id) on delete cascade,
  role_code text not null, -- EXECUTOR, PREVENTION, WORKPLACE_MANAGER, AUTHORIZER
  signer_id uuid references public.profiles(id) on delete set null,
  signer_name text not null,
  signer_role_label text default '',
  status text not null default 'pending', -- pending, signed, refused
  rejection_reason text default '',
  signature_mode text not null default 'digital', -- digital, handwritten_upload
  signature_storage_path text,
  signed_at timestamptz,
  signed_ip text,
  step_order integer not null default 1,
  created_at timestamptz not null default now()
);

comment on table public.work_permit_signatures is 'Registre légal des signatures de validation pour chaque permis de travail.';

alter table public.work_permit_signatures enable row level security;

-- Trigger set_company_id()
drop trigger if exists trg_set_company_id_work_permit_signatures on public.work_permit_signatures;
create trigger trg_set_company_id_work_permit_signatures
  before insert on public.work_permit_signatures
  for each row execute function public.set_company_id();

-- Indexation
create index if not exists work_permit_signatures_permit_id_idx on public.work_permit_signatures(work_permit_id, step_order);
create index if not exists work_permit_signatures_company_id_idx on public.work_permit_signatures(company_id);

-- Policies RLS
drop policy if exists work_permit_signatures_select_multi_company on public.work_permit_signatures;
create policy work_permit_signatures_select_multi_company
  on public.work_permit_signatures for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists work_permit_signatures_write_multi_company on public.work_permit_signatures;
create policy work_permit_signatures_write_multi_company
  on public.work_permit_signatures for all
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
  );

-- 2. Extension de work_permit_workers (Accusé individuel d'émargement) -----------
alter table public.work_permit_workers
  add column if not exists acknowledgement_status text default 'pending', -- pending, acknowledged, refused
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledgement_method text default 'digital', -- digital, paper
  add column if not exists rejection_reason text default '';

comment on column public.work_permit_workers.acknowledgement_status is 'Statut d''émargement / prise de connaissance de l''intervenant (pending, acknowledged, refused).';
