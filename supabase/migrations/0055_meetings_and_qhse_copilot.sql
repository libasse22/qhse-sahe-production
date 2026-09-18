-- ============================================================================
-- Migration 0055 : Réunions QHSE, Procès-Verbaux (PV) & Copilote QHSE
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Table principale des Réunions -------------------------------------------
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  reference text not null,
  title text not null,
  meeting_type text not null default 'qhse',
  status text not null default 'planifiee',
  scheduled_at timestamptz not null,
  started_at timestamptz,
  ended_at timestamptz,
  location text,
  organizer_user_id uuid references public.profiles(id) on delete set null,
  secretary_user_id uuid references public.profiles(id) on delete set null,
  description text,
  agenda text,
  notes text,
  document_id uuid references public.documents(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint meetings_company_reference_key unique (company_id, reference),
  constraint meetings_type_check check (
    meeting_type in ('qhse', 'hse', 'securite', 'revue_direction', 'toolbox', 'causerie', 'inspection', 'autre')
  ),
  constraint meetings_status_check check (
    status in ('planifiee', 'en_cours', 'pv_a_valider', 'validee', 'signee', 'archivee', 'annulee')
  )
);

-- Trigger company_id automatique
drop trigger if exists set_company_id_meetings on public.meetings;
create trigger set_company_id_meetings
  before insert on public.meetings
  for each row execute function public.set_company_id();

-- 2. Participants à la réunion ----------------------------------------------
create table if not exists public.meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  role text,
  organization text,
  attendance_status text not null default 'present',
  signature_required boolean not null default false,
  created_at timestamptz not null default now(),

  constraint meeting_participants_attendance_check check (
    attendance_status in ('present', 'absent', 'excuse', 'representant')
  )
);

-- 3. Points à l'Ordre du Jour -----------------------------------------------
create table if not exists public.meeting_agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  position integer not null default 1,
  title text not null,
  description text,
  source_type text,
  source_id uuid,
  status text not null default 'en_attente',
  created_at timestamptz not null default now(),

  constraint meeting_agenda_source_type_check check (
    source_type is null or source_type in (
      'cockpit', 'incident', 'inspection', 'audit', 'capa', 'work_permit', 'epi', 'document', 'previous_meeting', 'manual'
    )
  )
);

-- 4. Décisions de la Réunion -------------------------------------------------
create table if not exists public.meeting_decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  agenda_item_id uuid references public.meeting_agenda_items(id) on delete set null,
  decision_text text not null,
  decision_type text not null default 'decision',
  responsible_user_id uuid references public.profiles(id) on delete set null,
  deadline date,
  status text not null default 'validee',
  created_at timestamptz not null default now()
);

-- 5. Actions de la Réunion ---------------------------------------------------
create table if not exists public.meeting_action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  decision_id uuid references public.meeting_decisions(id) on delete set null,
  title text not null,
  description text,
  responsible_user_id uuid references public.profiles(id) on delete set null,
  responsible_name text,
  due_date date,
  priority text not null default 'moyenne',
  status text not null default 'a_faire',
  action_id uuid references public.actions_correctives(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint meeting_action_priority_check check (
    priority in ('faible', 'moyenne', 'elevee', 'critique')
  )
);

-- 6. Extension de actions_correctives pour lier les Réunions -----------------
alter table public.actions_correctives
  add column if not exists meeting_id uuid references public.meetings(id) on delete set null;

create index if not exists actions_meeting_id_idx on public.actions_correctives (meeting_id);

-- 7. Historique Immuable des Réunions ---------------------------------------
create table if not exists public.meeting_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  event_type text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists set_company_id_meeting_history on public.meeting_history;
create trigger set_company_id_meeting_history
  before insert on public.meeting_history
  for each row execute function public.set_company_id();

-- 8. Historique Immuable des Interactions Copilote IA -----------------------
create table if not exists public.copilot_audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  user_name text,
  query_text text not null,
  operation_type text not null default 'ask_qhse',
  sources_used jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists set_company_id_copilot_audit_logs on public.copilot_audit_logs;
create trigger set_company_id_copilot_audit_logs
  before insert on public.copilot_audit_logs
  for each row execute function public.set_company_id();

-- 9. Fonction de Codification Automatique Réunions (REU-YYYY-XXX) -----------
create or replace function public.generate_meeting_reference(
  p_company_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_count integer;
  v_ref text;
begin
  select count(*) + 1 into v_count
  from public.meetings
  where company_id = p_company_id
    and to_char(scheduled_at, 'YYYY') = v_year;

  v_ref := 'REU-' || v_year || '-' || lpad(v_count::text, 3, '0');
  return v_ref;
end;
$$;

-- 10. Politiques RLS Multi-Tenant Strictes -----------------------------------
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.meeting_agenda_items enable row level security;
alter table public.meeting_decisions enable row level security;
alter table public.meeting_action_items enable row level security;
alter table public.meeting_history enable row level security;
alter table public.copilot_audit_logs enable row level security;

-- Meetings
drop policy if exists meetings_select_company on public.meetings;
create policy meetings_select_company on public.meetings
  for select using (company_id = public.current_company_id());

drop policy if exists meetings_insert_company on public.meetings;
create policy meetings_insert_company on public.meetings
  for insert with check (company_id = public.current_company_id());

drop policy if exists meetings_update_company on public.meetings;
create policy meetings_update_company on public.meetings
  for update using (company_id = public.current_company_id());

drop policy if exists meetings_delete_company on public.meetings;
create policy meetings_delete_company on public.meetings
  for delete using (company_id = public.current_company_id() and public.has_permission('settings.manage'));

-- Meeting Participants
drop policy if exists meeting_participants_select on public.meeting_participants;
create policy meeting_participants_select on public.meeting_participants
  for select using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id and m.company_id = public.current_company_id()
    )
  );

drop policy if exists meeting_participants_all on public.meeting_participants;
create policy meeting_participants_all on public.meeting_participants
  for all using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id and m.company_id = public.current_company_id()
    )
  );

-- Agenda Items
drop policy if exists meeting_agenda_items_all on public.meeting_agenda_items;
create policy meeting_agenda_items_all on public.meeting_agenda_items
  for all using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id and m.company_id = public.current_company_id()
    )
  );

-- Decisions
drop policy if exists meeting_decisions_all on public.meeting_decisions;
create policy meeting_decisions_all on public.meeting_decisions
  for all using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id and m.company_id = public.current_company_id()
    )
  );

-- Actions Items
drop policy if exists meeting_action_items_all on public.meeting_action_items;
create policy meeting_action_items_all on public.meeting_action_items
  for all using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id and m.company_id = public.current_company_id()
    )
  );

-- History
drop policy if exists meeting_history_select on public.meeting_history;
create policy meeting_history_select on public.meeting_history
  for select using (company_id = public.current_company_id());

drop policy if exists meeting_history_insert on public.meeting_history;
create policy meeting_history_insert on public.meeting_history
  for insert with check (company_id = public.current_company_id());

-- Copilot Audit Logs
drop policy if exists copilot_logs_select on public.copilot_audit_logs;
create policy copilot_logs_select on public.copilot_audit_logs
  for select using (company_id = public.current_company_id());

drop policy if exists copilot_logs_insert on public.copilot_audit_logs;
create policy copilot_logs_insert on public.copilot_audit_logs
  for insert with check (company_id = public.current_company_id());
