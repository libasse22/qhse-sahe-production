-- ============================================================================
-- Migration 0042 : Moteur CAPA Unifié & Traçabilité (Module CAPA Phase 1)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Types Énumérés CAPA Additifs ---------------------------------------------

do $$ begin
  create type public.capa_action_type as enum ('corrective', 'preventive', 'amelioration');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.qhse_domain as enum ('qualite', 'securite', 'environnement', 'hygiene');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.action_priority as enum ('faible', 'moyenne', 'elevee', 'critique');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.capa_efficiency_status as enum ('non_evalue', 'efficace', 'partiellement_efficace', 'inefficace');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.action_block_category as enum ('ressources', 'budget', 'fournisseur', 'dependance', 'validation_management', 'technique', 'autre');
exception when duplicate_object then null; end $$;

-- 2. Colonnes additives sur actions_correctives ------------------------------

alter table public.actions_correctives
  add column if not exists code_reference text,
  add column if not exists type_action public.capa_action_type not null default 'corrective',
  add column if not exists domaine_qhse public.qhse_domain not null default 'securite',
  add column if not exists priorite public.action_priority not null default 'moyenne',
  add column if not exists work_permit_id uuid references public.work_permits(id) on delete set null,
  add column if not exists parent_action_id uuid references public.actions_correctives(id) on delete set null,
  add column if not exists echeance_initiale date,
  add column if not exists extension_count integer not null default 0,
  add column if not exists is_blocked boolean not null default false,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason_category public.action_block_category,
  add column if not exists blocked_reason_detail text,
  add column if not exists blocked_by uuid references public.profiles(id),
  add column if not exists unblocked_at timestamptz,
  add column if not exists unblocked_by uuid references public.profiles(id),
  add column if not exists cause_immediate text,
  add column if not exists cause_racine text,
  add column if not exists methode_analyse text,
  add column if not exists analyse_5_pourquoi jsonb default '[]'::jsonb,
  add column if not exists efficacite_statut public.capa_efficiency_status not null default 'non_evalue',
  add column if not exists date_verification timestamptz,
  add column if not exists verificateur_id uuid references public.profiles(id),
  add column if not exists commentaire_efficacite text,
  add column if not exists motif_rejet text,
  add column if not exists cloture_at timestamptz,
  add column if not exists cloture_par uuid references public.profiles(id);

alter table public.actions_correctives
  alter column status set default 'ouverte'::public.action_status;

-- Hiérarchie utilisateur sur profiles
alter table public.profiles
  add column if not exists manager_id uuid references public.profiles(id) on delete set null;

-- 3. Contraintes d'intégrité & Unicité du Code Référence --------------------

do $$ begin
  alter table public.actions_correctives
    add constraint check_single_source
    check (num_nonnulls(incident_id, inspection_run_id, audit_id, risk_id, work_permit_id) <= 1);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.actions_correctives
    add constraint actions_company_code_ref_key unique (company_id, code_reference);
exception when duplicate_object then null; end $$;

-- Trigger d'auto-génération transactionnelle du code_reference (ACT-YYYY-NNNN)
create or replace function public.generate_action_code_reference()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year text;
  v_seq integer;
  v_company_id uuid;
begin
  v_company_id := coalesce(new.company_id, public.current_company_id(), '11111111-1111-1111-1111-111111111111'::uuid);
  v_year := to_char(coalesce(new.created_at, now()), 'YYYY');

  if new.code_reference is null or new.code_reference = '' then
    select coalesce(max(
      nullif(regexp_replace(code_reference, '^ACT-' || v_year || '-', ''), code_reference)::integer
    ), 0) + 1
    into v_seq
    from public.actions_correctives
    where company_id = v_company_id
      and code_reference like 'ACT-' || v_year || '-%';

    new.code_reference := 'ACT-' || v_year || '-' || lpad(v_seq::text, 4, '0');
  end if;

  if new.echeance_initiale is null then
    new.echeance_initiale := new.echeance;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_generate_action_code_reference on public.actions_correctives;
create trigger trg_generate_action_code_reference
  before insert on public.actions_correctives
  for each row execute function public.generate_action_code_reference();

-- 4. Reprise des Données Existantes -----------------------------------------

update public.actions_correctives
set echeance_initiale = echeance
where echeance_initiale is null;

update public.actions_correctives
set status = 'ouverte'
where status::text = 'a_faire';

update public.actions_correctives
set status = 'cloturee',
    cloture_at = updated_at
where status::text = 'termine';

-- Génération rétrospective des code_reference pour les anciennes actions
do $$
declare
  r record;
begin
  for r in (
    select id from public.actions_correctives where code_reference is null order by created_at asc
  ) loop
    update public.actions_correctives set updated_at = updated_at where id = r.id;
  end loop;
end $$;

-- 5. Table action_comments (Journal d'Exécution Opérationnel) ---------------

create table if not exists public.action_comments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  action_id uuid not null references public.actions_correctives(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  comment text not null,
  created_at timestamptz not null default now()
);

comment on table public.action_comments is 'Journal d''avancement et commentaires opérationnels sur les actions CAPA.';

alter table public.action_comments enable row level security;

drop trigger if exists trg_set_company_id_action_comments on public.action_comments;
create trigger trg_set_company_id_action_comments
  before insert on public.action_comments
  for each row execute function public.set_company_id();

-- Immuabilité des commentaires (Interdiction UPDATE et DELETE)
create or replace function public.prevent_comment_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Les commentaires d''avancement CAPA sont immuables et ne peuvent être modifiés ou supprimés.';
end;
$$;

drop trigger if exists trg_prevent_comment_mutation on public.action_comments;
create trigger trg_prevent_comment_mutation
  before update or delete on public.action_comments
  for each row execute function public.prevent_comment_mutation();

-- 6. Table action_history (Journal d'Audit Technique Immuable) -------------

create table if not exists public.action_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  action_id uuid not null references public.actions_correctives(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  event_type text not null,
  old_data jsonb,
  new_data jsonb,
  comment text,
  created_at timestamptz not null default now()
);

comment on table public.action_history is 'Journal d''audit technique immuable (append-only) pour la traçabilité des mutations CAPA.';

alter table public.action_history enable row level security;

drop trigger if exists trg_set_company_id_action_history on public.action_history;
create trigger trg_set_company_id_action_history
  before insert on public.action_history
  for each row execute function public.set_company_id();

-- Immuabilité absolue de l'audit log (Interdiction UPDATE et DELETE)
create or replace function public.prevent_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Le journal d''audit CAPA est un registre légal immuable append-only.';
end;
$$;

drop trigger if exists trg_prevent_history_mutation on public.action_history;
create trigger trg_prevent_history_mutation
  before update or delete on public.action_history
  for each row execute function public.prevent_history_mutation();

-- 7. Indexation pour Performances -------------------------------------------

create index if not exists actions_company_status_idx on public.actions_correctives (company_id, status);
create index if not exists actions_parent_action_id_idx on public.actions_correctives (parent_action_id);
create index if not exists actions_work_permit_id_idx on public.actions_correctives (work_permit_id);
create index if not exists action_comments_action_id_idx on public.action_comments (action_id, created_at desc);
create index if not exists action_history_action_id_idx on public.action_history (action_id, created_at desc);
create index if not exists profiles_manager_id_idx on public.profiles (manager_id);

-- 8. Policies RLS Multi-Tenant -----------------------------------------------

-- action_comments
drop policy if exists action_comments_select_multi_company on public.action_comments;
create policy action_comments_select_multi_company
  on public.action_comments for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists action_comments_insert_multi_company on public.action_comments;
create policy action_comments_insert_multi_company
  on public.action_comments for insert
  with check (
    (company_id is null or company_id = public.current_company_id())
    and author_id = auth.uid()
    and public.is_active_user()
  );

-- action_history
drop policy if exists action_history_select_multi_company on public.action_history;
create policy action_history_select_multi_company
  on public.action_history for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists action_history_insert_multi_company on public.action_history;
create policy action_history_insert_multi_company
  on public.action_history for insert
  with check (
    (company_id is null or company_id = public.current_company_id())
    and actor_id = auth.uid()
    and public.is_active_user()
  );

-- 9. Nouvelles Permissions Atomiques CAPA ----------------------------------

insert into public.permissions (code, label, category) values
  ('actions.create',            'Créer une action CAPA',                           'Actions correctives'),
  ('actions.edit',              'Modifier une action ouverte',                     'Actions correctives'),
  ('actions.assign',            'Réassigner le responsable d''une action',          'Actions correctives'),
  ('actions.comment',           'Ajouter des notes au journal d''avancement',       'Actions correctives'),
  ('actions.validate',          'Soumettre ou valider le traitement d''une action', 'Actions correctives'),
  ('actions.verify',            'Évaluer l''efficacité d''une action CAPA',         'Actions correctives'),
  ('actions.close',             'Clôturer définitivement une action CAPA',        'Actions correctives'),
  ('actions.reopen',            'Réouvrir une action clôturée ou rejetée',         'Actions correctives'),
  ('actions.manage_extensions', 'Accorder une prolongation d''échéance',           'Actions correctives'),
  ('actions.manage_proofs',     'Ajouter ou supprimer des preuves justificatives',  'Actions correctives'),
  ('actions.view_audit_log',    'Consulter l''audit log technique immuable',       'Actions correctives')
on conflict (code) do nothing;

-- Octroi des permissions aux rôles système
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'Administrateur'
  and p.category = 'Actions correctives'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'Manager QHSE'
  and p.category = 'Actions correctives'
on conflict do nothing;

-- 10. Mettre à jour la protection des actions clôturées/rejetées --------------

create or replace function public.protect_action_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Si l'action est déjà clôturée ou rejetée, seule une réouverture explicite peut lever le verrou
  if old.status in ('cloturee', 'rejetee') and new.status not in ('reouverte', 'en_cours') then
    raise exception 'Une action CAPA clôturée ou rejetée ne peut plus être modifiée sans réouverture officielle.';
  end if;

  if not public.is_qhse_or_admin() then
    new.incident_id := old.incident_id;
    new.inspection_run_id := old.inspection_run_id;
    new.inspection_item_id := old.inspection_item_id;
    new.audit_id := old.audit_id;
    new.risk_id := old.risk_id;
    new.work_permit_id := old.work_permit_id;
    new.description := old.description;
    new.responsable_id := old.responsable_id;
    new.echeance := old.echeance;
    new.code_reference := old.code_reference;
  end if;

  new.updated_at := now();
  return new;
end;
$$;
