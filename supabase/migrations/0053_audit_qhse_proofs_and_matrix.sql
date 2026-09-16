-- ============================================================================
-- Migration 0053 : Module d'Audit QHSE Transversal & Matrice de Preuves 360° (Phase N)
-- QHSE Duo Sénégal — Mode "Montrez-moi la Preuve"
-- ============================================================================

-- 1. Extension de la table audits ---------------------------------------------
alter table public.audits
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists site_id uuid references public.sites(id) on delete set null,
  add column if not exists reference_framework text default 'Système de Management QHSE - Référentiel Interne';

-- 2. Table audit_items (Points de contrôle / checklist d'audit) ---------------
create table if not exists public.audit_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  audit_id uuid not null references public.audits(id) on delete cascade,
  title text not null,
  requirement text default '',
  category text default 'maitrise_operationnelle',
  status text not null default 'non_evalue', -- conforme, non_conforme, observation, non_applicable, non_evalue
  comment text default '',
  capa_action_id uuid references public.actions_correctives(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.audit_items is 'Points d''évaluation d''un audit QHSE rattachables aux exigences et aux preuves.';

alter table public.audit_items enable row level security;

-- Trigger set_company_id()
drop trigger if exists trg_set_company_id_audit_items on public.audit_items;
create trigger trg_set_company_id_audit_items
  before insert on public.audit_items
  for each row execute function public.set_company_id();

-- Indexation
create index if not exists audit_items_audit_id_idx on public.audit_items(audit_id);
create index if not exists audit_items_company_id_idx on public.audit_items(company_id);

-- RLS Policies
drop policy if exists audit_items_select_multi_company on public.audit_items;
create policy audit_items_select_multi_company
  on public.audit_items for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists audit_items_write_multi_company on public.audit_items;
create policy audit_items_write_multi_company
  on public.audit_items for all
  using (
    company_id = public.current_company_id()
    and (public.has_permission('actions.manage') or public.is_qhse_or_admin())
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
  );

-- 3. Table audit_proof_links (Liaisons centrales "Montrez-moi la Preuve") ----
create table if not exists public.audit_proof_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  audit_id uuid not null references public.audits(id) on delete cascade,
  audit_item_id uuid references public.audit_items(id) on delete cascade,
  proof_type text not null, -- ged_document, incident, inspection, capa_action, work_permit, epi_assignment, situation_proof, qhse_report
  target_id uuid not null,
  title text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_proof_links is 'Rattachement sans duplication de preuves existantes (GED, Incidents, Inspections, Permis, EPI, CAPA) aux points d''audit.';

alter table public.audit_proof_links enable row level security;

-- Trigger set_company_id()
drop trigger if exists trg_set_company_id_audit_proof_links on public.audit_proof_links;
create trigger trg_set_company_id_audit_proof_links
  before insert on public.audit_proof_links
  for each row execute function public.set_company_id();

-- Indexation
create index if not exists audit_proof_links_audit_id_idx on public.audit_proof_links(audit_id);
create index if not exists audit_proof_links_item_id_idx on public.audit_proof_links(audit_item_id);
create index if not exists audit_proof_links_company_id_idx on public.audit_proof_links(company_id);

-- RLS Policies
drop policy if exists audit_proof_links_select_multi_company on public.audit_proof_links;
create policy audit_proof_links_select_multi_company
  on public.audit_proof_links for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists audit_proof_links_write_multi_company on public.audit_proof_links;
create policy audit_proof_links_write_multi_company
  on public.audit_proof_links for all
  using (
    company_id = public.current_company_id()
    and (public.has_permission('actions.manage') or public.is_qhse_or_admin())
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
  );

-- 4. Table audit_history (Journal d'audit append-only) ------------------------
create table if not exists public.audit_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  audit_id uuid not null references public.audits(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  actor_name text not null default 'Utilisateur',
  event_type text not null, -- audit_created, status_updated, item_added, item_status_updated, proof_linked, proof_unlinked, capa_created, audit_closed
  comment text default '',
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_history is 'Journal d''événements inaltérable (append-only) traçant toutes les actions sur les audits QHSE.';

alter table public.audit_history enable row level security;

-- Trigger set_company_id()
drop trigger if exists trg_set_company_id_audit_history on public.audit_history;
create trigger trg_set_company_id_audit_history
  before insert on public.audit_history
  for each row execute function public.set_company_id();

-- Indexation
create index if not exists audit_history_audit_id_idx on public.audit_history(audit_id);
create index if not exists audit_history_company_id_idx on public.audit_history(company_id);
create index if not exists audit_history_created_at_idx on public.audit_history(created_at);

-- RLS Policies (Append-only: SELECT & INSERT uniquement)
drop policy if exists audit_history_select_multi_company on public.audit_history;
create policy audit_history_select_multi_company
  on public.audit_history for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists audit_history_insert_multi_company on public.audit_history;
create policy audit_history_insert_multi_company
  on public.audit_history for insert
  with check (
    (company_id is null or company_id = public.current_company_id())
    and public.is_active_user()
  );
