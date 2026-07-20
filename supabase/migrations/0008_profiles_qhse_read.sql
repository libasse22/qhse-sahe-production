-- ============================================================================
-- Migration 0008 : lecture des profils par les managers QHSE
-- QHSE Duo Sénégal — correction non destructive
-- ============================================================================

-- Jusqu'ici, seuls les admins pouvaient lire tous les profils
-- (policy profiles_select_admin, migration 0001). Les managers QHSE en ont
-- besoin pour : afficher les noms des déclarants/assignés sur les incidents,
-- peupler les listes d'assignation (responsable d'action, assignation
-- d'incident), et calculer le taux de lecture de la politique QHSE.

create policy profiles_select_qhse
  on public.profiles for select
  using (public.is_qhse_or_admin());
