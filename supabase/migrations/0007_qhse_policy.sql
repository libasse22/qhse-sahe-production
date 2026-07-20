-- ============================================================================
-- Migration 0007 : Politique QHSE — diffusion et accusés de lecture
-- QHSE Duo Sénégal
-- Exigence ISO 9001 §5.2 / ISO 14001 §5.2 / ISO 45001 §5.2 :
-- la politique doit être documentée, communiquée et comprise par le personnel.
-- ============================================================================

-- 1. Table qhse_policies -----------------------------------------------------------
-- Historique des versions. Une seule version est "active" à la fois : c'est
-- celle diffusée et sur laquelle portent les accusés de lecture.

create table public.qhse_policies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  version integer not null,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.qhse_policies is 'Versions successives de la politique QHSE de l''entreprise.';

create index qhse_policies_is_active_idx on public.qhse_policies (is_active);

-- 2. Table policy_acknowledgements --------------------------------------------------
-- Un utilisateur ne peut accuser réception qu'une seule fois par version.

create table public.policy_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.qhse_policies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  unique (policy_id, user_id)
);

comment on table public.policy_acknowledgements is
  'Trace de lecture/compréhension de chaque version de la politique QHSE par utilisateur.';

create index policy_acknowledgements_policy_id_idx on public.policy_acknowledgements (policy_id);
create index policy_acknowledgements_user_id_idx on public.policy_acknowledgements (user_id);

-- 3. Un seul document actif à la fois -----------------------------------------------
-- Quand une nouvelle version est publiée comme active, les précédentes sont
-- automatiquement désactivées.

create function public.deactivate_previous_policies()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active then
    update public.qhse_policies set is_active = false where id <> new.id and is_active = true;
  end if;
  return new;
end;
$$;

create trigger trg_deactivate_previous_policies
  after insert on public.qhse_policies
  for each row execute function public.deactivate_previous_policies();

-- 4. Row Level Security --------------------------------------------------------------

alter table public.qhse_policies enable row level security;
alter table public.policy_acknowledgements enable row level security;

-- Tout utilisateur actif peut lire les versions de la politique.
create policy qhse_policies_select_active
  on public.qhse_policies for select
  using (exists (select 1 from public.profiles where id = auth.uid() and status = 'active'));

-- Seuls manager QHSE / admin peuvent publier une nouvelle version.
create policy qhse_policies_insert_qhse
  on public.qhse_policies for insert
  with check (public.is_qhse_or_admin() and created_by = auth.uid());

create policy qhse_policies_delete_admin
  on public.qhse_policies for delete
  using (public.is_admin());

-- Chacun peut accuser réception pour son propre compte, et consulter son
-- propre historique. Manager QHSE / admin voient tous les accusés (taux de
-- lecture de l'organisation).
create policy policy_ack_select_own
  on public.policy_acknowledgements for select
  using (auth.uid() = user_id or public.is_qhse_or_admin());

create policy policy_ack_insert_own
  on public.policy_acknowledgements for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
  );
