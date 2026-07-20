-- ============================================================================
-- Migration 0011 : Objectifs & indicateurs QHSE
-- (ISO 9001 §6.2 / 14001 §6.2 / 45001 §6.2)
-- QHSE Duo Sénégal
-- ============================================================================

create type public.objective_status as enum ('en_cours', 'atteint', 'non_atteint');

create table public.qhse_objectives (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  unit text not null default '',
  target_value numeric not null,
  current_value numeric not null default 0,
  deadline date not null,
  status public.objective_status not null default 'en_cours',
  owner_id uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.qhse_objectives is 'Objectifs QHSE mesurables et leur avancement (ex : taux de fréquence des accidents, % actions clôturées à temps).';

create trigger trg_qhse_objectives_updated_at
  before update on public.qhse_objectives
  for each row execute function public.set_updated_at();

alter table public.qhse_objectives enable row level security;

-- Transparence : tout utilisateur actif peut consulter les objectifs.
create policy objectives_select_active
  on public.qhse_objectives for select
  using (exists (select 1 from public.profiles where id = auth.uid() and status = 'active'));

create policy objectives_write_qhse
  on public.qhse_objectives for all
  using (public.is_qhse_or_admin())
  with check (public.is_qhse_or_admin());

create index qhse_objectives_status_idx on public.qhse_objectives (status);
