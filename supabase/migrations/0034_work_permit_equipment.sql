-- ============================================================================
-- Migration 0034 : Rattachement des Équipements aux Permis de Travail (PtW)
-- QHSE Duo Sénégal
-- ============================================================================

ALTER TABLE public.work_permits
  ADD COLUMN IF NOT EXISTS equipment_id uuid REFERENCES public.equipment(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS work_permits_equipment_id_idx ON public.work_permits(equipment_id);
