-- ============================================================================
-- Migration 0048 : Référentiels & Modèles de Permis de Travail (PtW Templates)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Table work_permit_templates (Modèles logiques par entreprise) ------------
create table if not exists public.work_permit_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  description text default '',
  code text not null,
  version_major integer not null default 1,
  version_minor integer not null default 0,
  status text not null default 'brouillon', -- brouillon, actif, archive
  is_default boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.work_permit_templates is 'Catalogue des modèles/référentiels de permis de travail configurables par entreprise.';

alter table public.work_permit_templates enable row level security;

-- Trigger set_company_id()
drop trigger if exists trg_set_company_id_work_permit_templates on public.work_permit_templates;
create trigger trg_set_company_id_work_permit_templates
  before insert on public.work_permit_templates
  for each row execute function public.set_company_id();

-- 2. Table work_permit_template_versions (Versions publiées immuables) ---------
create table if not exists public.work_permit_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.work_permit_templates(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  version_major integer not null default 1,
  version_minor integer not null default 0,
  version_label text not null default 'v1.0',
  status text not null default 'actif', -- actif, archive
  configuration jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.work_permit_template_versions is 'Versions publiées d''un référentiel PtW. Une fois liée à un permis, la version demeure immuable.';

alter table public.work_permit_template_versions enable row level security;

-- Trigger set_company_id()
drop trigger if exists trg_set_company_id_work_permit_template_versions on public.work_permit_template_versions;
create trigger trg_set_company_id_work_permit_template_versions
  before insert on public.work_permit_template_versions
  for each row execute function public.set_company_id();

-- 3. Extension de work_permits pour l'ancrage de la version / snapshot -------
alter table public.work_permits
  add column if not exists template_id uuid references public.work_permit_templates(id) on delete set null,
  add column if not exists template_version_id uuid references public.work_permit_template_versions(id) on delete set null,
  add column if not exists template_snapshot jsonb default null;

-- Indexation
create index if not exists work_permit_templates_company_id_idx on public.work_permit_templates(company_id);
create index if not exists work_permit_template_versions_template_id_idx on public.work_permit_template_versions(template_id);
create index if not exists work_permits_template_id_idx on public.work_permits(template_id);
create index if not exists work_permits_template_version_id_idx on public.work_permits(template_version_id);

-- 4. Policies RLS Multi-tenant ------------------------------------------------
drop policy if exists work_permit_templates_select_multi_company on public.work_permit_templates;
create policy work_permit_templates_select_multi_company
  on public.work_permit_templates for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists work_permit_templates_write_multi_company on public.work_permit_templates;
create policy work_permit_templates_write_multi_company
  on public.work_permit_templates for all
  using (
    company_id = public.current_company_id()
    and (public.has_permission('permits.templates.edit') or public.is_qhse_or_admin())
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
  );

drop policy if exists work_permit_template_versions_select_multi_company on public.work_permit_template_versions;
create policy work_permit_template_versions_select_multi_company
  on public.work_permit_template_versions for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists work_permit_template_versions_write_multi_company on public.work_permit_template_versions;
create policy work_permit_template_versions_write_multi_company
  on public.work_permit_template_versions for all
  using (
    company_id = public.current_company_id()
    and (public.has_permission('permits.templates.publish') or public.is_qhse_or_admin())
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
  );

-- 5. Nouvelles permissions atomiques pour la gestion des référentiels PtW ------
insert into public.permissions (code, label, category) values
  ('permits.templates.view',    'Consulter les référentiels de permis de travail',  'Permis de travail'),
  ('permits.templates.create',  'Créer un référentiel de permis de travail',        'Permis de travail'),
  ('permits.templates.edit',    'Éditer un modèle de permis de travail',            'Permis de travail'),
  ('permits.templates.publish', 'Publier une version de référentiel PtW',           'Permis de travail'),
  ('permits.templates.archive', 'Archiver un référentiel de permis de travail',      'Permis de travail')
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
