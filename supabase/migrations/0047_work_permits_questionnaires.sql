-- ============================================================================
-- Migration 0047 : Permis de Travail Intelligent - Questionnaires Dynamiques (Phase F)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Extension des types de travaux (toiture, tuyauterie, maconnerie, excavation)
do $$ begin
  alter type public.work_permit_type add value if not exists 'toiture';
exception when duplicate_object then null; end $$;

do $$ begin
  alter type public.work_permit_type add value if not exists 'tuyauterie';
exception when duplicate_object then null; end $$;

do $$ begin
  alter type public.work_permit_type add value if not exists 'maconnerie';
exception when duplicate_object then null; end $$;

do $$ begin
  alter type public.work_permit_type add value if not exists 'excavation';
exception when duplicate_object then null; end $$;

-- 2. Champs JSONB additifs pour stocker les questionnaires et mesures terrain ------
alter table public.work_permits
  add column if not exists questionnaire_answers jsonb default '{}'::jsonb,
  add column if not exists before_measures jsonb default '[]'::jsonb,
  add column if not exists during_measures jsonb default '[]'::jsonb,
  add column if not exists after_measures jsonb default '[]'::jsonb,
  add column if not exists epi_requirements jsonb default '[]'::jsonb,
  add column if not exists emergency_plan jsonb default '{}'::jsonb;
