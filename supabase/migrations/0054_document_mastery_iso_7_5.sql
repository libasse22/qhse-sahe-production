-- ============================================================================
-- Migration 0054 : Maîtrise Documentaire QHSE & Contrôle ISO 7.5 (Phase L)
-- QHSE Duo Sénégal — Origine, Vérification Externe & Politique de Conservation
-- ============================================================================

-- 1. Extension de la table public.documents -----------------------------------
alter table public.documents
  add column if not exists origin_type text not null default 'interne', -- interne, externe
  add column if not exists external_source text default '',
  add column if not exists external_reference text default '',
  add column if not exists external_document_date date,
  add column if not exists external_received_date date,
  add column if not exists retention_duration_years integer default 5,
  add column if not exists retention_unit text default 'ans'; -- ans, mois, indefini

comment on column public.documents.origin_type is 'Origine du document : interne (création propre) ou externe (fournisseur, organisme, norme).';

create index if not exists documents_origin_type_idx on public.documents(company_id, origin_type);
create index if not exists documents_external_ref_idx on public.documents(company_id, external_reference);

-- 2. Extension de la table public.document_revisions --------------------------
alter table public.document_revisions
  add column if not exists verification_status text not null default 'verifie', -- a_verifier, verifie, rejete
  add column if not exists verified_by uuid references public.profiles(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists rejection_reason text default '',
  add column if not exists rejection_category text default '';

comment on column public.document_revisions.verification_status is 'Statut de vérification de la révision : a_verifier, verifie, rejete.';

create index if not exists document_revisions_verification_idx on public.document_revisions(document_id, verification_status);

-- 3. Table public.document_retention_policies (Politiques de Conservation) ----
create table if not exists public.document_retention_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  document_type text not null, -- politique, procedure, permis, rapport, audit, inspection, default, etc.
  retention_years integer not null default 5,
  retention_unit text not null default 'ans', -- ans, mois, indefini
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, document_type)
);

comment on table public.document_retention_policies is 'Politiques de conservation documentaire configurables par entreprise et par type.';

alter table public.document_retention_policies enable row level security;

drop trigger if exists trg_set_company_id_document_retention_policies on public.document_retention_policies;
create trigger trg_set_company_id_document_retention_policies
  before insert on public.document_retention_policies
  for each row execute function public.set_company_id();

create index if not exists document_retention_policies_company_type_idx on public.document_retention_policies(company_id, document_type);

drop policy if exists document_retention_policies_select_multi_company on public.document_retention_policies;
create policy document_retention_policies_select_multi_company
  on public.document_retention_policies for select
  using (company_id = public.current_company_id() and public.is_active_user());

drop policy if exists document_retention_policies_write_multi_company on public.document_retention_policies;
create policy document_retention_policies_write_multi_company
  on public.document_retention_policies for all
  using (
    company_id = public.current_company_id()
    and (public.has_permission('documents.manage') or public.is_qhse_or_admin())
  )
  with check (company_id is null or company_id = public.current_company_id());

-- 4. Reprise des documents et révisions existants ------------------------------
do $$
begin
  -- Les documents existants sont marqués origine 'interne' par défaut
  update public.documents
  set origin_type = 'interne'
  where origin_type is null;

  -- Les révisions existantes sont marquées 'verifie' par défaut pour rétro-compatibilité
  update public.document_revisions
  set verification_status = 'verifie'
  where verification_status is null;
end $$;
