-- ============================================================================
-- Migration 0036 : Module Gestion & Traçabilité des EPI
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Table epi_catalog --------------------------------------------------------
create table if not exists public.epi_catalog (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  category text not null default 'autre',
  iso_norm text default '',
  lifespan_months integer default 24,
  periodic_inspection_days integer default 365,
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.epi_catalog is 'Référentiel des modèles d''EPI configurés par entreprise.';

alter table public.epi_catalog enable row level security;

-- 2. Table epi_assignments ----------------------------------------------------
create table if not exists public.epi_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  catalog_id uuid references public.epi_catalog(id) on delete restrict,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id),
  serial_number text default '',
  quantity integer not null default 1,
  size text default '',
  condition_state text not null default 'bon', -- 'neuf', 'bon', 'use', 'defectueux'
  status text not null default 'attribue', -- 'attribue', 'en_service', 'a_renouveler', 'restitue', 'perdu_endommage'
  assigned_at timestamptz not null default now(),
  renewal_due_at timestamptz,
  returned_at timestamptz,
  renewal_reason text default '',
  signature_proof text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.epi_assignments is 'Registre des attributions et renouvellements d''EPI aux employés.';

alter table public.epi_assignments enable row level security;

-- 3. Triggers set_company_id() --------------------------------------------------
drop trigger if exists trg_set_company_id_epi_catalog on public.epi_catalog;
create trigger trg_set_company_id_epi_catalog
  before insert on public.epi_catalog
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_epi_assignments on public.epi_assignments;
create trigger trg_set_company_id_epi_assignments
  before insert on public.epi_assignments
  for each row execute function public.set_company_id();

-- 4. Index ----------------------------------------------------------------------
create index if not exists epi_catalog_company_id_idx on public.epi_catalog(company_id);
create index if not exists epi_assignments_company_id_idx on public.epi_assignments(company_id);
create index if not exists epi_assignments_recipient_id_idx on public.epi_assignments(recipient_id);
create index if not exists epi_assignments_catalog_id_idx on public.epi_assignments(catalog_id);
create index if not exists epi_assignments_status_idx on public.epi_assignments(status);

-- 5. Permission -----------------------------------------------------------------
insert into public.permissions (code, label, category)
values ('epi.manage', 'Gérer le catalogue et les remises d''EPI', 'EPI')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name in ('Administrateur', 'Manager QHSE') and p.code = 'epi.manage'
on conflict do nothing;

-- 6. RLS Policies Multi-Tenant --------------------------------------------------

-- epi_catalog
drop policy if exists epi_catalog_select_multi_company on public.epi_catalog;
create policy epi_catalog_select_multi_company
  on public.epi_catalog for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists epi_catalog_write_multi_company on public.epi_catalog;
create policy epi_catalog_write_multi_company
  on public.epi_catalog for all
  using (
    company_id = public.current_company_id()
    and (public.has_permission('epi.manage') or public.is_qhse_or_admin())
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
    and (public.has_permission('epi.manage') or public.is_qhse_or_admin())
  );

-- epi_assignments
drop policy if exists epi_assignments_select_multi_company on public.epi_assignments;
create policy epi_assignments_select_multi_company
  on public.epi_assignments for select
  using (
    company_id = public.current_company_id()
    and (recipient_id = auth.uid() or public.has_permission('epi.manage') or public.is_qhse_or_admin())
  );

drop policy if exists epi_assignments_write_multi_company on public.epi_assignments;
create policy epi_assignments_write_multi_company
  on public.epi_assignments for all
  using (
    company_id = public.current_company_id()
    and (public.has_permission('epi.manage') or public.is_qhse_or_admin())
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
    and (public.has_permission('epi.manage') or public.is_qhse_or_admin())
  );
