-- ============================================================================
-- Migration 0025 : Correction de la récursion infinie RLS sur profiles (42P17)
-- QHSE Duo Sénégal
-- ============================================================================
-- La migration 0024 a introduit une policy `profiles_select_active_users` qui
-- exécutait un SELECT direct sur `public.profiles` dans sa clause USING.
-- PostgreSQL déclenchait une récursion infinie (code 42P17) à chaque lecture.
--
-- Cette migration remplace cette sous-requête directe par une fonction
-- SECURITY DEFINER `is_active_user()`, identique à la convention de `is_admin()`.

-- 1. Fonction utilitaire SECURITY DEFINER -------------------------------------

create or replace function public.is_active_user()
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
  );
$$;

-- 2. Correction de la policy sur profiles -------------------------------------

drop policy if exists profiles_select_active_users on public.profiles;

create policy profiles_select_active_users
  on public.profiles for select
  using (
    status = 'active'
    and public.is_active_user()
  );
