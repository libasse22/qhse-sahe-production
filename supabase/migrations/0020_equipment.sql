-- ============================================================================
-- Migration 0020 : Équipements & QR codes
-- QHSE Duo Sénégal
-- ============================================================================
-- Pas de bibliothèque de génération de QR côté serveur : chaque équipement
-- est identifié par son UUID, et le QR imprimé encode simplement l'URL
-- publique /scan/{id}. Scanner ce QR avec l'appareil photo natif du
-- téléphone (aucune app dédiée requise) ouvre directement cette page, qui
-- redirige vers la déclaration d'incident pré-remplie pour cet équipement.

create type public.equipment_status as enum ('operationnel', 'maintenance', 'hors_service');

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  serial_number text not null default '',
  site_id uuid references public.sites (id) on delete set null,
  status public.equipment_status not null default 'operationnel',
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.equipment is 'Équipements/machines identifiés par QR code, rattachés à un site.';

create trigger trg_equipment_updated_at
  before update on public.equipment
  for each row execute function public.set_updated_at();

-- Un incident peut être rattaché à l'équipement scanné au moment de la déclaration.
alter table public.incidents add column equipment_id uuid references public.equipment (id) on delete set null;

create index equipment_site_id_idx on public.equipment (site_id);
create index incidents_equipment_id_idx on public.incidents (equipment_id);

-- 1. Nouvelle permission ---------------------------------------------------------------

insert into public.permissions (code, label, category) values
  ('equipment.manage', 'Créer et gérer les équipements', 'Équipements');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name in ('Administrateur', 'Manager QHSE') and p.code = 'equipment.manage';

-- 2. Row Level Security ----------------------------------------------------------------
-- Lecture ouverte à tous les utilisateurs actifs (un ouvrier doit pouvoir
-- scanner et consulter la fiche d'un équipement). Écriture réservée à la
-- permission equipment.manage.

alter table public.equipment enable row level security;

create policy equipment_select_active
  on public.equipment for select
  using (exists (select 1 from public.profiles where id = auth.uid() and status = 'active'));

create policy equipment_write_permission
  on public.equipment for all
  using (public.has_permission('equipment.manage'))
  with check (public.has_permission('equipment.manage'));

-- 3. Élargir la gestion des sites (migration 0005, jusqu'ici réservée au
-- strict is_admin()) à la même permission, puisque la création d'un
-- équipement nécessite de pouvoir créer le site associé.

drop policy sites_write_admin on public.sites;
create policy sites_write_permission
  on public.sites for all
  using (public.has_permission('equipment.manage') or public.is_admin())
  with check (public.has_permission('equipment.manage') or public.is_admin());
