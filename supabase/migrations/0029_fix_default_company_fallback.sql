-- ============================================================================
-- Migration 0029 : Fallback d'entreprise par défaut pour les nouveaux profils
-- QHSE Duo Sénégal
-- ============================================================================
-- Lorsqu'un profil est créé sans company_id (inscription / nouveau compte),
-- current_company_id() renvoyait NULL, ce qui bloquait l'utilisateur sur toutes
-- les requêtes RLS (dont l'enregistrement des signalements).
--
-- Cette migration :
-- 1. Ajoute un fallback sur l'entreprise par défaut dans current_company_id().
-- 2. Met à jour handle_new_user() pour attribuer par défaut 'Entreprise Principale'.
-- 3. Rattache tous les profils et incidents avec company_id NULL.

-- 1. Mise à jour de current_company_id() avec fallback -----------------------

create or replace function public.current_company_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select company_id from public.profiles where id = auth.uid()),
    '11111111-1111-1111-1111-111111111111'::uuid
  );
$$;

-- 2. Mise à jour du trigger d'inscription -----------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, company_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    '11111111-1111-1111-1111-111111111111'::uuid
  )
  on conflict (id) do update
  set company_id = coalesce(public.profiles.company_id, '11111111-1111-1111-1111-111111111111'::uuid);
  return new;
end;
$$;

-- 3. Nettoyage des enregistrements orphelins ---------------------------------

update public.profiles
set company_id = '11111111-1111-1111-1111-111111111111'
where company_id is null;

update public.incidents
set company_id = '11111111-1111-1111-1111-111111111111'
where company_id is null;

update public.actions_correctives
set company_id = '11111111-1111-1111-1111-111111111111'
where company_id is null;

update public.incident_photos
set company_id = '11111111-1111-1111-1111-111111111111'
where company_id is null;

update public.incident_voice_notes
set company_id = '11111111-1111-1111-1111-111111111111'
where company_id is null;
