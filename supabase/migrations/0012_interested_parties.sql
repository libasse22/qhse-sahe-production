-- ============================================================================
-- Migration 0012 : Parties intéressées & obligations de conformité
-- (ISO 14001 §4.2 / §6.1.3 — également requis par 9001 §4.2 et 45001 §4.2)
-- QHSE Duo Sénégal
-- ============================================================================

create table public.interested_parties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  expectations text not null default '',
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.interested_parties is 'Parties intéressées pertinentes (autorités, clients, riverains, fournisseurs, salariés…) et leurs attentes.';

create type public.compliance_status as enum ('conforme', 'non_conforme', 'a_verifier');

create table public.compliance_obligations (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  source text not null default '',
  status public.compliance_status not null default 'a_verifier',
  review_date date,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.compliance_obligations is 'Obligations de conformité (textes réglementaires, normes, exigences contractuelles) et leur statut.';

create trigger trg_compliance_obligations_updated_at
  before update on public.compliance_obligations
  for each row execute function public.set_updated_at();

alter table public.interested_parties enable row level security;
alter table public.compliance_obligations enable row level security;

create policy interested_parties_all_qhse
  on public.interested_parties for all
  using (public.is_qhse_or_admin())
  with check (public.is_qhse_or_admin());

create policy compliance_obligations_all_qhse
  on public.compliance_obligations for all
  using (public.is_qhse_or_admin())
  with check (public.is_qhse_or_admin());

create index compliance_obligations_status_idx on public.compliance_obligations (status);
