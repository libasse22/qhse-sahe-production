-- ============================================================================
-- Migration 0010 : Registre des risques (ISO 31000 ; ISO 9001 §6.1 /
-- 14001 §6.1.2 / 45001 §6.1.2)
-- QHSE Duo Sénégal
-- ============================================================================

create type public.risk_category as enum ('qualite', 'securite', 'environnement', 'autre');
create type public.risk_status as enum ('identifie', 'en_traitement', 'maitrise', 'cloture');

create table public.risks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category public.risk_category not null default 'autre',
  probability smallint not null check (probability between 1 and 5),
  gravity smallint not null check (gravity between 1 and 5),
  criticality smallint generated always as (probability * gravity) stored,
  treatment text not null default '',
  owner_id uuid references public.profiles (id) on delete set null,
  status public.risk_status not null default 'identifie',
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.risks is
  'Registre des risques et opportunités (méthodologie ISO 31000 : criticité = probabilité × gravité).';

create trigger trg_risks_updated_at
  before update on public.risks
  for each row execute function public.set_updated_at();

alter table public.risks enable row level security;

-- Le registre est un outil de pilotage QHSE : réservé aux managers QHSE /
-- admin, à l'exception du propriétaire désigné du risque qui peut consulter
-- et faire évoluer le traitement de son propre risque (responsabilisation,
-- cf. notion de "risk owner" en ISO 31000).
create policy risks_all_qhse
  on public.risks for all
  using (public.is_qhse_or_admin())
  with check (public.is_qhse_or_admin());

create policy risks_select_owner
  on public.risks for select
  using (auth.uid() = owner_id);

create policy risks_update_owner
  on public.risks for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index risks_status_idx on public.risks (status);
create index risks_category_idx on public.risks (category);
create index risks_criticality_idx on public.risks (criticality);
create index risks_owner_id_idx on public.risks (owner_id);
