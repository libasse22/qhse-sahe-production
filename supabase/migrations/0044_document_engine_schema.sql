-- ============================================================================
-- Migration 0044 : Moteur Documentaire Transversal & GED Entreprise (Phase B)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Table document_folders (Arborescence des Dossiers GED) -------------------
create table if not exists public.document_folders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  parent_id uuid references public.document_folders(id) on delete cascade,
  name text not null,
  code_prefix text,
  description text default '',
  icon text default 'folder',
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.document_folders is 'Arborescence des dossiers et sous-dossiers de la GED Entreprise.';

alter table public.document_folders enable row level security;

drop trigger if exists trg_set_company_id_document_folders on public.document_folders;
create trigger trg_set_company_id_document_folders
  before insert on public.document_folders
  for each row execute function public.set_company_id();

create index if not exists document_folders_company_id_idx on public.document_folders(company_id);
create index if not exists document_folders_parent_id_idx on public.document_folders(parent_id);

drop policy if exists document_folders_select_multi_company on public.document_folders;
create policy document_folders_select_multi_company
  on public.document_folders for select
  using (company_id = public.current_company_id() and public.is_active_user());

drop policy if exists document_folders_write_multi_company on public.document_folders;
create policy document_folders_write_multi_company
  on public.document_folders for all
  using (company_id = public.current_company_id() and (public.has_permission('documents.manage') or public.is_qhse_or_admin()))
  with check (company_id is null or company_id = public.current_company_id());

-- 2. Colonnes additives sur public.documents ---------------------------------
alter table public.documents
  add column if not exists code_reference text,
  add column if not exists folder_id uuid references public.document_folders(id) on delete set null,
  add column if not exists document_type text not null default 'autre',
  add column if not exists domaine_qhse text not null default 'securite',
  add column if not exists version_major integer not null default 1,
  add column if not exists version_minor integer not null default 0,
  add column if not exists revision_code text not null default 'REV00',
  add column if not exists status text not null default 'brouillon',
  add column if not exists original_filename text,
  add column if not exists file_type text,
  add column if not exists file_size bigint,
  add column if not exists is_generated boolean not null default false,
  add column if not exists source_module text,
  add column if not exists source_entity_id uuid,
  add column if not exists effective_date date,
  add column if not exists review_date date,
  add column if not exists expiry_date date,
  add column if not exists tags text[] default '{}'::text[];

alter table public.documents alter column storage_path drop not null;

create index if not exists documents_code_reference_idx on public.documents(company_id, code_reference);
create index if not exists documents_status_idx on public.documents(company_id, status);
create index if not exists documents_folder_id_idx on public.documents(folder_id);
create index if not exists documents_source_entity_idx on public.documents(source_module, source_entity_id);

-- 3. Table document_revisions (Physique des versions) ------------------------
create table if not exists public.document_revisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  revision_code text not null default 'REV00',
  version_major integer not null default 1,
  version_minor integer not null default 0,
  storage_path text not null,
  signed_storage_path text,
  change_summary text default '',
  status text not null default 'obsolete',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

comment on table public.document_revisions is 'Révisions et versions physiques des fichiers documentaires GED.';

alter table public.document_revisions enable row level security;

drop trigger if exists trg_set_company_id_document_revisions on public.document_revisions;
create trigger trg_set_company_id_document_revisions
  before insert on public.document_revisions
  for each row execute function public.set_company_id();

create index if not exists document_revisions_company_id_idx on public.document_revisions(company_id);
create index if not exists document_revisions_document_id_idx on public.document_revisions(document_id);
create index if not exists document_revisions_status_idx on public.document_revisions(document_id, status);

create unique index if not exists idx_unique_active_revision_per_doc
  on public.document_revisions(document_id)
  where status = 'en_vigueur';

drop policy if exists document_revisions_select_multi_company on public.document_revisions;
create policy document_revisions_select_multi_company
  on public.document_revisions for select
  using (company_id = public.current_company_id() and public.is_active_user());

drop policy if exists document_revisions_write_multi_company on public.document_revisions;
create policy document_revisions_write_multi_company
  on public.document_revisions for all
  using (company_id = public.current_company_id() and (public.has_permission('documents.manage') or public.is_qhse_or_admin()))
  with check (company_id is null or company_id = public.current_company_id());

-- 4. Table document_links (Liaisons génériques n-n avec objets métier) --------
create table if not exists public.document_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  relationship_type text not null default 'associated',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

comment on table public.document_links is 'Table générique de liaison n-n entre les documents GED et tous les objets métier QHSE.';

alter table public.document_links enable row level security;

drop trigger if exists trg_set_company_id_document_links on public.document_links;
create trigger trg_set_company_id_document_links
  before insert on public.document_links
  for each row execute function public.set_company_id();

create index if not exists document_links_company_id_idx on public.document_links(company_id);
create index if not exists document_links_document_id_idx on public.document_links(document_id);
create index if not exists document_links_entity_idx on public.document_links(entity_type, entity_id);

drop policy if exists document_links_select_multi_company on public.document_links;
create policy document_links_select_multi_company
  on public.document_links for select
  using (company_id = public.current_company_id() and public.is_active_user());

drop policy if exists document_links_write_multi_company on public.document_links;
create policy document_links_write_multi_company
  on public.document_links for all
  using (company_id = public.current_company_id() and (public.has_permission('documents.manage') or public.is_qhse_or_admin()))
  with check (company_id is null or company_id = public.current_company_id());

-- 5. Table document_code_configs (Codification transactionnelle par entreprise)
create table if not exists public.document_code_configs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  document_type text not null,
  prefix text not null,
  domain text not null default 'HSE',
  number_digits integer not null default 3,
  revision_prefix text not null default 'REV',
  next_number integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, document_type)
);

comment on table public.document_code_configs is 'Paramétrage de la codification documentaire par type et entreprise.';

alter table public.document_code_configs enable row level security;

drop trigger if exists trg_set_company_id_document_code_configs on public.document_code_configs;
create trigger trg_set_company_id_document_code_configs
  before insert on public.document_code_configs
  for each row execute function public.set_company_id();

create index if not exists document_code_configs_company_type_idx on public.document_code_configs(company_id, document_type);

drop policy if exists document_code_configs_select_multi_company on public.document_code_configs;
create policy document_code_configs_select_multi_company
  on public.document_code_configs for select
  using (company_id = public.current_company_id() and public.is_active_user());

drop policy if exists document_code_configs_write_multi_company on public.document_code_configs;
create policy document_code_configs_write_multi_company
  on public.document_code_configs for all
  using (company_id = public.current_company_id() and (public.has_permission('documents.manage') or public.is_qhse_or_admin()))
  with check (company_id is null or company_id = public.current_company_id());

-- Fonction PL/pgSQL atomique et concurrent-safe pour générer le code documentaire
create or replace function public.generate_document_code_reference(
  p_company_id uuid,
  p_document_type text,
  p_domain text default 'HSE'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config record;
  v_prefix text;
  v_domain text;
  v_digits integer;
  v_number integer;
  v_code text;
begin
  select * into v_config
  from public.document_code_configs
  where company_id = p_company_id
    and document_type = p_document_type
  for update;

  if not found then
    v_prefix := case p_document_type
      when 'politique' then 'POL'
      when 'procedure' then 'PRO'
      when 'instruction' then 'INS'
      when 'formulaire' then 'FOR'
      when 'permis' then 'PER'
      when 'rapport' then 'REP'
      when 'audit' then 'AUD'
      when 'inspection' then 'CHK'
      when 'manuel' then 'MAN'
      else 'DOC'
    end;
    v_domain := coalesce(p_domain, 'HSE');
    v_digits := 3;
    v_number := 1;

    insert into public.document_code_configs (
      company_id, document_type, prefix, domain, number_digits, next_number
    ) values (
      p_company_id, p_document_type, v_prefix, v_domain, v_digits, 2
    );
  else
    v_prefix := v_config.prefix;
    v_domain := coalesce(p_domain, v_config.domain);
    v_digits := v_config.number_digits;
    v_number := v_config.next_number;

    update public.document_code_configs
    set next_number = next_number + 1,
        updated_at = now()
    where id = v_config.id;
  end if;

  v_code := v_prefix || '-' || v_domain || '-' || lpad(v_number::text, v_digits, '0');
  return v_code;
end;
$$;

-- 6. Table document_signatures (Moteur de Signatures) ------------------------
create table if not exists public.document_signatures (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  revision_id uuid not null references public.document_revisions(id) on delete cascade,
  signer_type text not null default 'internal_user',
  signer_id uuid references public.profiles(id) on delete set null,
  signer_name text not null,
  signer_role text default '',
  signer_email text default '',
  signature_mode text not null default 'digital_handwritten',
  signature_storage_path text,
  signature_status text not null default 'pending',
  rejection_reason text default '',
  signed_at timestamptz,
  signed_ip text,
  step_order integer not null default 1,
  created_at timestamptz not null default now()
);

comment on table public.document_signatures is 'Registre des demandes et réalisations de signatures manuscrites et émargements.';

alter table public.document_signatures enable row level security;

drop trigger if exists trg_set_company_id_document_signatures on public.document_signatures;
create trigger trg_set_company_id_document_signatures
  before insert on public.document_signatures
  for each row execute function public.set_company_id();

create index if not exists document_signatures_company_id_idx on public.document_signatures(company_id);
create index if not exists document_signatures_document_id_idx on public.document_signatures(document_id);
create index if not exists document_signatures_revision_id_idx on public.document_signatures(revision_id);

drop policy if exists document_signatures_select_multi_company on public.document_signatures;
create policy document_signatures_select_multi_company
  on public.document_signatures for select
  using (company_id = public.current_company_id() and public.is_active_user());

drop policy if exists document_signatures_write_multi_company on public.document_signatures;
create policy document_signatures_write_multi_company
  on public.document_signatures for all
  using (company_id = public.current_company_id() and (public.has_permission('documents.manage') or public.is_qhse_or_admin()))
  with check (company_id is null or company_id = public.current_company_id());

-- 7. Table document_external_shares (Liens d'accès externes temporaires) -----
create table if not exists public.document_external_shares (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  revision_id uuid references public.document_revisions(id) on delete cascade,
  share_token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  recipient_name text not null,
  recipient_email text default '',
  recipient_company text default '',
  can_view boolean not null default true,
  can_sign boolean not null default true,
  can_upload_signed boolean not null default true,
  passcode text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  accessed_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

comment on table public.document_external_shares is 'Accès temporaires sécurisés par token unique pour consultation et signature externe sans compte complet.';

alter table public.document_external_shares enable row level security;

drop trigger if exists trg_set_company_id_document_external_shares on public.document_external_shares;
create trigger trg_set_company_id_document_external_shares
  before insert on public.document_external_shares
  for each row execute function public.set_company_id();

create index if not exists document_external_shares_share_token_idx on public.document_external_shares(share_token);

drop policy if exists document_external_shares_select_multi_company on public.document_external_shares;
create policy document_external_shares_select_multi_company
  on public.document_external_shares for select
  using (company_id = public.current_company_id() and public.is_active_user());

drop policy if exists document_external_shares_write_multi_company on public.document_external_shares;
create policy document_external_shares_write_multi_company
  on public.document_external_shares for all
  using (company_id = public.current_company_id() and (public.has_permission('documents.manage') or public.is_qhse_or_admin()))
  with check (company_id is null or company_id = public.current_company_id());

-- 8. Table document_history (Journal d'Audit Immuable GED) -------------------
create table if not exists public.document_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  actor_name text not null,
  event_type text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.document_history is 'Journal d''audit technique immuable (append-only) de la GED.';

alter table public.document_history enable row level security;

drop trigger if exists trg_set_company_id_document_history on public.document_history;
create trigger trg_set_company_id_document_history
  before insert on public.document_history
  for each row execute function public.set_company_id();

create or replace function public.prevent_document_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Le journal d''audit de la GED est un registre légal immuable append-only.';
end;
$$;

drop trigger if exists trg_prevent_document_history_mutation on public.document_history;
create trigger trg_prevent_document_history_mutation
  before update or delete on public.document_history
  for each row execute function public.prevent_document_history_mutation();

create index if not exists document_history_document_id_idx on public.document_history(document_id, created_at desc);

drop policy if exists document_history_select_multi_company on public.document_history;
create policy document_history_select_multi_company
  on public.document_history for select
  using (company_id = public.current_company_id() and public.is_active_user());

drop policy if exists document_history_insert_multi_company on public.document_history;
create policy document_history_insert_multi_company
  on public.document_history for insert
  with check ((company_id is null or company_id = public.current_company_id()) and public.is_active_user());

-- 9. Reprise des documents existants -----------------------------------------
do $$
declare
  r record;
begin
  for r in (
    select d.id, d.company_id, d.title, d.category, d.storage_path, d.uploaded_by, d.created_at
    from public.documents d
    where d.code_reference is null
  ) loop
    update public.documents
    set code_reference = 'DOC-HSE-' || substring(r.id::text from 1 for 6),
        revision_code = 'REV00',
        status = 'en_vigueur',
        is_generated = false
    where id = r.id;

    if r.storage_path is not null then
      insert into public.document_revisions (
        company_id, document_id, revision_code, version_major, version_minor, storage_path, change_summary, status, created_by, created_at
      ) values (
        r.company_id, r.id, 'REV00', 1, 0, r.storage_path, 'Document initial', 'en_vigueur', r.uploaded_by, r.created_at
      ) on conflict do nothing;
    end if;
  end loop;
end $$;
