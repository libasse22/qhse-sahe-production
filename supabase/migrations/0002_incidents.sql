-- ============================================================================
-- Migration 0002 : Déclaration et suivi des incidents (Module 2)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Types énumérés -------------------------------------------------------------

create type public.incident_category as enum (
  'accident_travail',
  'presque_accident',
  'risque_identifie',
  'non_conformite',
  'environnement',
  'materiel',
  'autre'
);

create type public.incident_severity as enum ('faible', 'moyenne', 'elevee', 'critique');
create type public.incident_status as enum ('declare', 'en_cours', 'resolu', 'cloture');

-- 2. Fonction utilitaire : l'utilisateur courant est-il manager QHSE ou admin actif ?
-- Réutilisée par les modules 2, 3 et 6.

create function public.is_qhse_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and status = 'active'
      and role in ('admin', 'manager_qhse')
  );
$$;

-- 3. Trigger générique de mise à jour de updated_at ------------------------------
-- Réutilisé par les tables des modules suivants.

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 4. Table incidents ---------------------------------------------------------------

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category public.incident_category not null default 'autre',
  severity public.incident_severity not null default 'faible',
  status public.incident_status not null default 'declare',
  location text not null default '',
  occurred_at timestamptz not null default now(),
  reported_by uuid not null references public.profiles (id) on delete restrict,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.incidents is 'Déclarations d''incidents, presque-accidents et non-conformités QHSE.';

create trigger trg_incidents_updated_at
  before update on public.incidents
  for each row execute function public.set_updated_at();

-- 5. Row Level Security -------------------------------------------------------------

alter table public.incidents enable row level security;

-- Lecture : un employé voit les incidents qu'il a déclarés ou qui lui sont
-- assignés ; manager QHSE et admin voient tout.
create policy incidents_select_own
  on public.incidents for select
  using (auth.uid() = reported_by or auth.uid() = assigned_to);

create policy incidents_select_qhse
  on public.incidents for select
  using (public.is_qhse_or_admin());

-- Création : tout utilisateur actif peut déclarer un incident en son nom.
create policy incidents_insert_active
  on public.incidents for insert
  with check (
    auth.uid() = reported_by
    and exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
  );

-- Mise à jour : le déclarant peut corriger sa déclaration tant qu'elle reste au
-- statut initial ; manager QHSE / admin gèrent le cycle de vie complet
-- (changement de statut, assignation).
create policy incidents_update_own
  on public.incidents for update
  using (auth.uid() = reported_by and status = 'declare')
  with check (auth.uid() = reported_by);

create policy incidents_update_qhse
  on public.incidents for update
  using (public.is_qhse_or_admin())
  with check (true);

create policy incidents_delete_admin
  on public.incidents for delete
  using (public.is_admin());

-- 6. Index -----------------------------------------------------------------------

create index incidents_status_idx on public.incidents (status);
create index incidents_severity_idx on public.incidents (severity);
create index incidents_category_idx on public.incidents (category);
create index incidents_reported_by_idx on public.incidents (reported_by);
create index incidents_assigned_to_idx on public.incidents (assigned_to);
