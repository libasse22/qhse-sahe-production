-- ============================================================================
-- Migration 0043 : Work Permits V2 - Phase 1 (Control of Work & Audit Trail)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Ajout du statut 'suspendu' sur public.work_permit_status ------------------
alter type public.work_permit_status add value if not exists 'suspendu';

-- 2. Colonne work_permit_id sur situation_proofs ------------------------------
alter table public.situation_proofs
  add column if not exists work_permit_id uuid references public.work_permits(id) on delete set null;

create index if not exists situation_proofs_work_permit_id_idx on public.situation_proofs(work_permit_id);

-- 3. Table work_permit_history (Journal d'Audit PtW Immuable) ----------------
create table if not exists public.work_permit_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  permit_id uuid not null references public.work_permits(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  event_type text not null,
  old_status public.work_permit_status,
  new_status public.work_permit_status,
  details jsonb,
  comment text,
  created_at timestamptz not null default now()
);

comment on table public.work_permit_history is 'Journal d''audit immuable (append-only) pour la traçabilité des mutations des permis de travail.';

alter table public.work_permit_history enable row level security;

drop trigger if exists trg_set_company_id_work_permit_history on public.work_permit_history;
create trigger trg_set_company_id_work_permit_history
  before insert on public.work_permit_history
  for each row execute function public.set_company_id();

-- Immuabilité du journal d'audit PtW (Interdiction UPDATE et DELETE)
create or replace function public.prevent_work_permit_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Le journal d''audit des permis de travail est un registre légal immuable append-only.';
end;
$$;

drop trigger if exists trg_prevent_work_permit_history_mutation on public.work_permit_history;
create trigger trg_prevent_work_permit_history_mutation
  before update or delete on public.work_permit_history
  for each row execute function public.prevent_work_permit_history_mutation();

create index if not exists work_permit_history_permit_id_idx on public.work_permit_history(permit_id, created_at desc);

-- Policies RLS pour work_permit_history
drop policy if exists work_permit_history_select_multi_company on public.work_permit_history;
create policy work_permit_history_select_multi_company
  on public.work_permit_history for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists work_permit_history_insert_multi_company on public.work_permit_history;
create policy work_permit_history_insert_multi_company
  on public.work_permit_history for insert
  with check (
    (company_id is null or company_id = public.current_company_id())
    and actor_id = auth.uid()
    and public.is_active_user()
  );

-- 4. Nouvelles Permissions Atomiques PtW ---------------------------------------
insert into public.permissions (code, label, category) values
  ('permits.create',   'Demander / Créer un permis de travail',          'Permis de travail'),
  ('permits.approve',  'Approuver ou refuser un permis de travail',      'Permis de travail'),
  ('permits.suspend',  'Suspendre ou reprendre un permis de travail',    'Permis de travail'),
  ('permits.close',    'Clôturer un permis de travail',                 'Permis de travail'),
  ('permits.print',    'Consulter et imprimer la fiche de permis',      'Permis de travail')
on conflict (code) do nothing;

-- Octroi des permissions aux rôles Administrateur et Manager QHSE
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'Administrateur'
  and p.category = 'Permis de travail'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'Manager QHSE'
  and p.category = 'Permis de travail'
on conflict do nothing;
