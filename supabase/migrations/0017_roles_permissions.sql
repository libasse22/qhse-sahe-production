-- ============================================================================
-- Migration 0017 : Rôles & permissions configurables
-- QHSE Duo Sénégal
-- ============================================================================
-- Objectif : permettre à l'admin de créer des rôles personnalisés avec des
-- permissions à la carte, sans casser l'existant. Approche volontairement
-- additive et rétrocompatible :
--   - la colonne profiles.role (enum admin/manager_qhse/employe) reste la
--     source de vérité pour tout ce qui est déjà construit (redirections,
--     policies RLS existantes) : AUCUNE régression sur l'app actuelle.
--   - une nouvelle colonne profiles.role_id vient s'ajouter, reliée à un
--     catalogue de rôles/permissions configurables, utilisée pour les
--     nouvelles fonctionnalités et la gestion fine des droits.
--   - chaque rôle (système ou personnalisé) porte un "espace" (base_bucket)
--     parmi 'admin' / 'manager_qhse' / 'employe' qui indique quelle
--     interface et quel comportement de routage il utilise — un rôle
--     personnalisé "Auditeur externe" peut par exemple être rattaché à
--     l'espace manager_qhse tout en n'ayant pas la permission users.manage.
-- ============================================================================

-- 1. Catalogue des permissions -------------------------------------------------------
-- Défini par le code applicatif (non éditable en ligne, sauf par migration).

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  category text not null
);

comment on table public.permissions is 'Catalogue fixe des permissions atomiques disponibles dans l''application.';

insert into public.permissions (code, label, category) values
  ('incidents.manage_all',      'Voir et traiter tous les incidents',              'Incidents'),
  ('actions.manage',            'Créer et gérer les actions correctives',          'Actions correctives'),
  ('audits.manage',             'Planifier et gérer les audits internes',          'Audits'),
  ('risks.manage',              'Gérer le registre des risques',                   'Risques'),
  ('objectives.manage',         'Définir et suivre les objectifs QHSE',            'Objectifs'),
  ('policy.publish',            'Publier la politique QHSE',                       'Politique QHSE'),
  ('compliance.manage',         'Gérer parties intéressées et conformité',         'Conformité'),
  ('reviews.manage',            'Créer des revues de direction',                   'Revues de direction'),
  ('documents.manage',          'Déposer et gérer les documents QHSE',             'Documents'),
  ('users.manage',              'Gérer les comptes utilisateurs',                  'Administration'),
  ('roles.manage',              'Créer et modifier les rôles personnalisés',       'Administration'),
  ('settings.manage',           'Modifier les paramètres de l''application',       'Administration');

-- 2. Rôles ---------------------------------------------------------------------------

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  base_bucket public.user_role not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.roles is
  'Rôles configurables. base_bucket indique l''espace applicatif (routage) utilisé par ce rôle.';

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

-- 3. Rôles système, en miroir des 3 rôles historiques --------------------------------

insert into public.roles (name, description, base_bucket, is_system) values
  ('Ouvrier', 'Déclare des incidents depuis l''espace Terrain.', 'employe', true),
  ('Manager QHSE', 'Gère incidents, audits, risques et pilotage QHSE.', 'manager_qhse', true),
  ('Administrateur', 'Accès complet, y compris gestion des utilisateurs et paramètres.', 'admin', true);

-- Le rôle Manager QHSE reçoit toutes les permissions métier (hors administration) ;
-- l'Administrateur reçoit tout ; l'Ouvrier n'a besoin d'aucune permission de gestion
-- (son espace Terrain ne dépend pas de ce catalogue).
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'Administrateur';

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'Manager QHSE'
  and p.code <> 'users.manage'
  and p.code <> 'roles.manage'
  and p.code <> 'settings.manage';

-- 4. Rattachement des profils existants ------------------------------------------------

alter table public.profiles add column role_id uuid references public.roles (id) on delete set null;

update public.profiles p
set role_id = r.id
from public.roles r
where r.is_system
  and (
    (p.role = 'admin' and r.name = 'Administrateur')
    or (p.role = 'manager_qhse' and r.name = 'Manager QHSE')
    or (p.role = 'employe' and r.name = 'Ouvrier')
  );

-- 5. Fonction utilitaire has_permission() ---------------------------------------------

create function public.has_permission(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles pr
    join public.role_permissions rp on rp.role_id = pr.role_id
    join public.permissions perm on perm.id = rp.permission_id
    where pr.id = auth.uid() and perm.code = permission_code
  );
$$;

-- 6. Étendre la protection des champs sensibles de profiles ----------------------------
-- role_id vient s'ajouter à la liste des colonnes qu'un utilisateur non-admin
-- ne peut jamais modifier lui-même (même chose pour company_id/site_id,
-- ajoutées en migration 0005 mais jamais protégées jusqu'ici).

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
    new.role_id := old.role_id;
    new.company_id := old.company_id;
    new.site_id := old.site_id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- 7. Row Level Security ----------------------------------------------------------------

alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;

create policy permissions_select_active
  on public.permissions for select
  using (exists (select 1 from public.profiles where id = auth.uid() and status = 'active'));

create policy roles_select_active
  on public.roles for select
  using (exists (select 1 from public.profiles where id = auth.uid() and status = 'active'));

-- Seul un admin peut créer/modifier/supprimer des rôles, et jamais les rôles
-- système (protège les 3 rôles historiques d'une suppression accidentelle).
create policy roles_insert_admin
  on public.roles for insert
  with check (public.is_admin());

create policy roles_update_admin
  on public.roles for update
  using (public.is_admin() and is_system = false)
  with check (public.is_admin());

create policy roles_delete_admin
  on public.roles for delete
  using (public.is_admin() and is_system = false);

create policy role_permissions_select_active
  on public.role_permissions for select
  using (exists (select 1 from public.profiles where id = auth.uid() and status = 'active'));

create policy role_permissions_write_admin
  on public.role_permissions for all
  using (
    public.is_admin()
    and exists (select 1 from public.roles where id = role_id and is_system = false)
  )
  with check (
    public.is_admin()
    and exists (select 1 from public.roles where id = role_id and is_system = false)
  );

create index profiles_role_id_idx on public.profiles (role_id);
