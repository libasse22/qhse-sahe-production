-- ============================================================================
-- Migration 0031 : Clé étrangère et identifiant d'item d'inspection sur actions_correctives
-- QHSE Duo Sénégal
-- ============================================================================

alter table public.actions_correctives
  add column if not exists inspection_run_id uuid references public.inspection_runs(id) on delete set null,
  add column if not exists inspection_item_id text;

create index if not exists actions_correctives_inspection_run_id_idx
  on public.actions_correctives(inspection_run_id);
