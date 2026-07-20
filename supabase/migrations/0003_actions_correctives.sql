-- ============================================================================
-- Migration 0003 : Actions correctives (Module 3)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Type énuméré ------------------------------------------------------------------

create type public.action_status as enum ('a_faire', 'en_cours', 'termine');

-- 2. Table actions_correctives ------------------------------------------------------

create table public.actions_correctives (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  description text not null,
  responsable_id uuid not null references public.profiles (id) on delete restrict,
  echeance date not null,
  status public.action_status not null default 'a_faire',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.actions_correctives is 'Actions correctives/préventives rattachées à un incident.';

-- 3. Protection des champs sensibles -------------------------------------------------
-- Le responsable d'une action ne peut modifier que son statut d'avancement.
-- Seuls manager QHSE / admin peuvent modifier la description, l'échéance,
-- l'incident lié ou réassigner le responsable.

create function public.protect_action_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_qhse_or_admin() then
    new.incident_id := old.incident_id;
    new.description := old.description;
    new.responsable_id := old.responsable_id;
    new.echeance := old.echeance;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_protect_action_fields
  before update on public.actions_correctives
  for each row execute function public.protect_action_fields();

-- 4. Row Level Security --------------------------------------------------------------

alter table public.actions_correctives enable row level security;

create policy actions_select_responsable
  on public.actions_correctives for select
  using (auth.uid() = responsable_id);

create policy actions_select_qhse
  on public.actions_correctives for select
  using (public.is_qhse_or_admin());

-- Création : réservée à manager QHSE / admin (une action naît du traitement
-- d'un incident, pas d'une déclaration libre).
create policy actions_insert_qhse
  on public.actions_correctives for insert
  with check (public.is_qhse_or_admin());

create policy actions_update_responsable
  on public.actions_correctives for update
  using (auth.uid() = responsable_id)
  with check (auth.uid() = responsable_id);

create policy actions_update_qhse
  on public.actions_correctives for update
  using (public.is_qhse_or_admin())
  with check (true);

create policy actions_delete_qhse
  on public.actions_correctives for delete
  using (public.is_qhse_or_admin());

-- 5. Index -----------------------------------------------------------------------

create index actions_incident_id_idx on public.actions_correctives (incident_id);
create index actions_responsable_id_idx on public.actions_correctives (responsable_id);
create index actions_status_idx on public.actions_correctives (status);
create index actions_echeance_idx on public.actions_correctives (echeance);
