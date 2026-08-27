-- ============================================================================
-- Migration 0024 : visibilité des profils entre utilisateurs actifs
-- QHSE Duo Sénégal
-- ============================================================================
-- Jusqu'ici, un utilisateur ne pouvait voir que son propre profil (sauf
-- admin/QHSE qui voient tout). La messagerie a besoin que n'importe quel
-- utilisateur actif puisse voir le nom des autres utilisateurs actifs
-- (choisir un destinataire, afficher qui a envoyé un message...).
--
-- Les comptes en attente ou suspendus restent invisibles aux autres
-- utilisateurs normaux (seuls admin/QHSE les voient, via les policies
-- existantes) : cette policy ne concerne que les comptes déjà actifs.

create policy profiles_select_active_users
  on public.profiles for select
  using (
    status = 'active'
    and exists (select 1 from public.profiles me where me.id = auth.uid() and me.status = 'active')
  );