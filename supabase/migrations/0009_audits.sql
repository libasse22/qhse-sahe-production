-- ============================================================================
-- Migration 0009 : Programme d'audit interne (ISO 9001 §9.2, guide ISO 19011)
-- QHSE Duo Sénégal
-- ============================================================================

create type public.audit_status as enum ('planifie', 'en_cours', 'termine');
create type public.finding_type as enum ('conformite', 'non_conformite_mineure', 'non_conformite_majeure', 'point_sensible');

create table public.audits (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  scope text not null default '',
  criteria text not null default '',
  auditor_id uuid not null references public.profiles (id) on delete restrict,
  planned_date date not null,
  status public.audit_status not null default 'planifie',
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.audits is 'Programme et planning des audits internes QHSE.';

create trigger trg_audits_updated_at
  before update on public.audits
  for each row execute function public.set_updated_at();

create table public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  type public.finding_type not null default 'conformite',
  description text not null,
  action_id uuid references public.actions_correctives (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.audit_findings is 'Constats d''audit (conformité, non-conformités, points sensibles), rattachables à une action corrective.';

alter table public.audits enable row level security;
alter table public.audit_findings enable row level security;

-- Processus interne QHSE : réservé aux managers QHSE / admin.
create policy audits_all_qhse
  on public.audits for all
  using (public.is_qhse_or_admin())
  with check (public.is_qhse_or_admin());

create policy audit_findings_all_qhse
  on public.audit_findings for all
  using (public.is_qhse_or_admin())
  with check (public.is_qhse_or_admin());

create index audits_status_idx on public.audits (status);
create index audit_findings_audit_id_idx on public.audit_findings (audit_id);
