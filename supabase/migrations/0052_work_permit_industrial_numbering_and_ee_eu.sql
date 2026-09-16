-- ============================================================================
-- Migration 0052 : Numérotation Industrielle & Responsabilité EE/EU (Phase L)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Table work_permit_code_configs (Séquence par Entreprise) ------------------
create table if not exists public.work_permit_code_configs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  prefix text not null default 'PER-HSE',
  next_number integer not null default 1,
  updated_at timestamptz not null default now()
);

comment on table public.work_permit_code_configs is 'Configuration de la séquence de numérotation industrielle des permis de travail par entreprise.';

alter table public.work_permit_code_configs enable row level security;

-- Trigger set_company_id()
drop trigger if exists trg_set_company_id_work_permit_code_configs on public.work_permit_code_configs;
create trigger trg_set_company_id_work_permit_code_configs
  before insert on public.work_permit_code_configs
  for each row execute function public.set_company_id();

-- Policies RLS Multi-tenant
drop policy if exists work_permit_code_configs_select_multi_company on public.work_permit_code_configs;
create policy work_permit_code_configs_select_multi_company
  on public.work_permit_code_configs for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists work_permit_code_configs_write_multi_company on public.work_permit_code_configs;
create policy work_permit_code_configs_write_multi_company
  on public.work_permit_code_configs for all
  using (
    company_id = public.current_company_id()
    and (public.has_permission('actions.manage') or public.is_qhse_or_admin())
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
  );

-- 2. Fonction RPC Transactionnelle : generate_work_permit_reference -----------
create or replace function public.generate_work_permit_reference(p_company_id uuid default null)
returns text
language plpgsql
security definer
as $$
declare
  v_company_id uuid;
  v_prefix text;
  v_curr_val integer;
  v_formatted text;
begin
  if p_company_id is not null then
    v_company_id := p_company_id;
  else
    v_company_id := public.current_company_id();
  end if;

  if v_company_id is null then
    raise exception 'Company context missing for permit reference generation';
  end if;

  -- Verrouillage de la séquence pour éviter toute collision sous concurrence
  select prefix, next_number
    into v_prefix, v_curr_val
    from public.work_permit_code_configs
   where company_id = v_company_id
   for update;

  if not found then
    v_prefix := 'PER-HSE';
    v_curr_val := 1;

    insert into public.work_permit_code_configs (company_id, prefix, next_number)
    values (v_company_id, v_prefix, 2);
  else
    update public.work_permit_code_configs
       set next_number = next_number + 1,
           updated_at = now()
     where company_id = v_company_id;
  end if;

  v_formatted := v_prefix || '-' || lpad(v_curr_val::text, 3, '0') || '-REV00';
  return v_formatted;
end;
$$;

-- 3. Champs étendus sur work_permits -------------------------------------------
alter table public.work_permits
  add column if not exists contractor_contact_name text default '',
  add column if not exists contractor_contact_phone text default '',
  add column if not exists decision text default '',
  add column if not exists equipment_ids jsonb default '[]'::jsonb;
