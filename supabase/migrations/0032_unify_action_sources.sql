-- ============================================================================
-- Migration 0032 : Consolidation des sources d'actions correctives (360° QHSE)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Rendre incident_id optionnel pour permettre la création d'actions depuis
-- d'autres sources QHSE (Inspections, Audits, Risques critiques, etc.)
alter table public.actions_correctives
  alter column incident_id drop not null;

-- 2. Ajouter les liaisons vers les Audits et Risques
alter table public.actions_correctives
  add column if not exists audit_id uuid references public.audits(id) on delete set null,
  add column if not exists risk_id uuid references public.risks(id) on delete set null;

-- 3. Indexation pour les performances
create index if not exists actions_audit_id_idx on public.actions_correctives (audit_id);
create index if not exists actions_risk_id_idx on public.actions_correctives (risk_id);

-- 4. Mise à jour de la fonction de protection des champs sensibles
create or replace function public.protect_action_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_qhse_or_admin() then
    new.incident_id := old.incident_id;
    new.inspection_run_id := old.inspection_run_id;
    new.inspection_item_id := old.inspection_item_id;
    new.audit_id := old.audit_id;
    new.risk_id := old.risk_id;
    new.description := old.description;
    new.responsable_id := old.responsable_id;
    new.echeance := old.echeance;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
