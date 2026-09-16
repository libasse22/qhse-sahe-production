-- ============================================================================
-- Migration 0051 : Journal d'Audit EPI & Inspecions Périodiques
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Colonnes d'inspection périodique sur epi_assignments ----------------------
alter table public.epi_assignments
  add column if not exists last_inspected_at timestamptz,
  add column if not exists last_inspected_by uuid references public.profiles(id);

-- 2. Table epi_history (Journal d'audit append-only) ---------------------------
create table if not exists public.epi_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  assignment_id uuid references public.epi_assignments(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  actor_name text not null default 'Utilisateur',
  recipient_id uuid references public.profiles(id) on delete set null,
  recipient_name text default '',
  action text not null, -- 'epi_attributed', 'epi_checked', 'epi_renewed', 'epi_expired', 'epi_retired', 'epi_acknowledged'
  comment text default '',
  created_at timestamptz not null default now()
);

comment on table public.epi_history is 'Journal append-only des événements d''attribution, de contrôle et d''émargement des EPI.';

alter table public.epi_history enable row level security;

-- 3. Trigger set_company_id() --------------------------------------------------
drop trigger if exists trg_set_company_id_epi_history on public.epi_history;
create trigger trg_set_company_id_epi_history
  before insert on public.epi_history
  for each row execute function public.set_company_id();

-- 4. Index ----------------------------------------------------------------------
create index if not exists epi_history_company_id_idx on public.epi_history(company_id);
create index if not exists epi_history_assignment_id_idx on public.epi_history(assignment_id);
create index if not exists epi_history_created_at_idx on public.epi_history(created_at);

-- 5. RLS Policies Multi-Tenant --------------------------------------------------
drop policy if exists epi_history_select_multi_company on public.epi_history;
create policy epi_history_select_multi_company
  on public.epi_history for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists epi_history_insert_multi_company on public.epi_history;
create policy epi_history_insert_multi_company
  on public.epi_history for insert
  with check (
    (company_id is null or company_id = public.current_company_id())
    and public.is_active_user()
  );
