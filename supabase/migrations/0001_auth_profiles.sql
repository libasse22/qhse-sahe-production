-- ============================================================================
-- Migration 0001 : Authentification & profils utilisateurs (Module 1)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Types énumérés -----------------------------------------------------------

create type public.user_role as enum ('admin', 'manager_qhse', 'employe');
create type public.user_status as enum ('pending', 'active', 'suspended');

-- 2. Table profiles -------------------------------------------------------------
-- Un profil est créé automatiquement à chaque inscription (voir trigger plus bas).
-- role/status par défaut : employe / pending -> un admin doit valider le compte.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.user_role not null default 'employe',
  status public.user_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Profil applicatif lié à chaque utilisateur Supabase Auth.';

-- 3. Fonction utilitaire : l'utilisateur courant est-il admin actif ? ----------
-- SECURITY DEFINER pour éviter la récursion RLS (une policy sur profiles qui
-- interroge profiles bloquerait sinon).

create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

-- 4. Création automatique du profil à l'inscription ----------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Protection des colonnes sensibles (role, status) --------------------------
-- Un utilisateur non-admin ne peut jamais changer son propre rôle ou statut,
-- même s'il parvient à passer une requête UPDATE sur sa ligne.

create function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- 6. Row Level Security ---------------------------------------------------------

alter table public.profiles enable row level security;

-- Lecture : chacun voit son propre profil, les admins voient tout le monde.
create policy profiles_select_own
  on public.profiles for select
  using (auth.uid() = id);

create policy profiles_select_admin
  on public.profiles for select
  using (public.is_admin());

-- Mise à jour : chacun peut modifier son propre profil (nom uniquement, cf.
-- trigger ci-dessus pour role/status), les admins peuvent tout modifier.
create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy profiles_update_admin
  on public.profiles for update
  using (public.is_admin())
  with check (true);

-- Aucune policy INSERT/DELETE pour les utilisateurs standards : la création se
-- fait uniquement via le trigger handle_new_user (SECURITY DEFINER).
create policy profiles_delete_admin
  on public.profiles for delete
  using (public.is_admin());

-- 7. Index -----------------------------------------------------------------------

create index profiles_status_idx on public.profiles (status);
create index profiles_role_idx on public.profiles (role);

-- ============================================================================
-- Après avoir exécuté cette migration :
-- 1) Crée ton premier compte via /signup dans l'application.
-- 2) Dans le SQL editor Supabase, promeus-le en admin actif :
--    update public.profiles set role = 'admin', status = 'active'
--    where email = 'ton.email@exemple.com';
-- 3) Tu pourras ensuite valider les prochains comptes depuis l'application.
-- ============================================================================
