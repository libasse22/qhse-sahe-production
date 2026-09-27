-- ============================================================================
-- Migration 0057 : Correctif RLS & RPC pour Web Push Subscriptions
-- QHSE Duo Sénégal
-- Permet la lecture sécurisée des jetons Push inter-utilisateurs pour l'expédition
-- des alertes en arrière-plan (Incidents, Messages, Permis, Actions).
-- ============================================================================

-- 1. Politique RLS de lecture autorisée pour les utilisateurs authentifiés -----------
drop policy if exists push_sub_select_own on public.push_subscriptions;

create policy push_sub_select_authenticated on public.push_subscriptions
  for select to authenticated using (true);

-- 2. Fonction RPC Security Definer pour garantir la récupération des endpoints -------
create or replace function public.get_push_subscriptions_for_user(p_user_id uuid)
returns table (
  id uuid,
  endpoint text,
  p256dh text,
  auth text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select ps.id, ps.endpoint, ps.p256dh, ps.auth
  from public.push_subscriptions ps
  where ps.user_id = p_user_id;
end;
$$;

comment on function public.get_push_subscriptions_for_user(uuid) is 'Récupère de manière sécurisée les jetons Web Push pour l expédition des notifications réseau.';
