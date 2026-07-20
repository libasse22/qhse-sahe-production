-- ============================================================================
-- Migration 0005 : Entreprises & sites (multi-établissement)
-- QHSE Duo Sénégal — Amélioration du schéma existant (non destructive)
-- ============================================================================

-- 1. Table companies -----------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

comment on table public.companies is 'Entreprise cliente de la plateforme QHSE Duo Sénégal.';

-- 2. Table sites -----------------------------------------------------------------

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  address text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.sites is 'Site / établissement physique rattaché à une entreprise.';

create index sites_company_id_idx on public.sites (company_id);

-- 3. Rattachement des profils et incidents à un site -----------------------------
-- Nullable : les comptes existants ne sont pas cassés, l'admin les rattache
-- ensuite depuis la gestion des utilisateurs.

alter table public.profiles add column company_id uuid references public.companies (id) on delete set null;
alter table public.profiles add column site_id uuid references public.sites (id) on delete set null;

alter table public.incidents add column site_id uuid references public.sites (id) on delete set null;

create index profiles_site_id_idx on public.profiles (site_id);
create index incidents_site_id_idx on public.incidents (site_id);

-- 4. Row Level Security -----------------------------------------------------------

alter table public.companies enable row level security;
alter table public.sites enable row level security;

-- Tout utilisateur actif peut lire les entreprises/sites (nécessaire pour les
-- listes déroulantes) ; seule la création/modification est réservée à l'admin.
create policy companies_select_active
  on public.companies for select
  using (exists (select 1 from public.profiles where id = auth.uid() and status = 'active'));

create policy companies_write_admin
  on public.companies for all
  using (public.is_admin())
  with check (public.is_admin());

create policy sites_select_active
  on public.sites for select
  using (exists (select 1 from public.profiles where id = auth.uid() and status = 'active'));

create policy sites_write_admin
  on public.sites for all
  using (public.is_admin())
  with check (public.is_admin());
