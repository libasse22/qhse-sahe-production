-- ============================================================================
-- Migration 0049 : Custom Sections, Fields & Tables pour Modèles PtW
-- QHSE Duo Sénégal
-- ============================================================================

-- Extension de la table work_permits pour stocker les données des sections/champs/tableaux personnalisés
alter table public.work_permits
  add column if not exists custom_fields_data jsonb default '{}'::jsonb;

comment on column public.work_permits.custom_fields_data is 'Données saisies pour les sections, champs et tableaux sur mesure définis par le référentiel entreprise.';
