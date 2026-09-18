-- ============================================================================
-- Migration 0056 : Socle de Connaissances QHSE (Knowledge Base & Ingestion)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Table principale des Sources de Connaissances ---------------------------
create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  title text not null,
  description text,
  source_type text not null default 'other',
  domain text not null default 'other',
  status text not null default 'active',
  priority integer not null default 2,
  version text not null default 'v1',
  document_id uuid references public.documents(id) on delete set null,
  revision_id uuid references public.document_revisions(id) on delete set null,
  storage_path text,
  original_filename text,
  mime_type text,
  file_size integer,
  language text default 'fr',
  author text,
  publisher text,
  publication_date date,
  standard_organization text,
  standard_reference text,
  detected_methods text[] default '{}'::text[],
  tags text[] default '{}'::text[],
  metadata jsonb default '{}'::jsonb,
  ingested_at timestamptz,
  ingestion_error text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint knowledge_sources_type_check check (
    source_type in (
      'methodology', 'course', 'tool_excel', 'standard_reference',
      'regulation', 'internal_document', 'template', 'other'
    )
  ),
  constraint knowledge_sources_domain_check check (
    domain in (
      'quality', 'health_safety', 'environment', 'risk', 'audit',
      'management', 'compliance', 'incident', 'emergency', 'training', 'other'
    )
  ),
  constraint knowledge_sources_status_check check (
    status in ('active', 'inactive', 'archived', 'error')
  ),
  constraint knowledge_sources_priority_check check (
    priority in (1, 2, 3)
  )
);

-- Trigger auto company_id pour les sources d'entreprise
drop trigger if exists set_company_id_knowledge_sources on public.knowledge_sources;
create trigger set_company_id_knowledge_sources
  before insert on public.knowledge_sources
  for each row execute function public.set_company_id();

-- 2. Table des Chunks de Connaissances --------------------------------------
create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  knowledge_source_id uuid not null references public.knowledge_sources(id) on delete cascade,
  chunk_index integer not null default 0,
  content text not null,
  title text,
  section text,
  page integer,
  sheet_name text,
  cell_range text,
  heading text,
  content_type text not null default 'text',
  domain text,
  detected_methods text[] default '{}'::text[],
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint knowledge_chunks_content_type_check check (
    content_type in (
      'text', 'table', 'methodology', 'definition', 'formula',
      'matrix', 'procedure', 'checklist', 'example', 'reference'
    )
  )
);

-- Trigger auto company_id pour les chunks
drop trigger if exists set_company_id_knowledge_chunks on public.knowledge_chunks;
create trigger set_company_id_knowledge_chunks
  before insert on public.knowledge_chunks
  for each row execute function public.set_company_id();

-- 3. Table des Logs d'Audit d'Ingestion -------------------------------------
create table if not exists public.knowledge_audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  knowledge_source_id uuid references public.knowledge_sources(id) on delete set null,
  event_type text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists set_company_id_knowledge_audit_logs on public.knowledge_audit_logs;
create trigger set_company_id_knowledge_audit_logs
  before insert on public.knowledge_audit_logs
  for each row execute function public.set_company_id();

-- 4. Index de performance ---------------------------------------------------
create index if not exists knowledge_sources_company_idx on public.knowledge_sources (company_id);
create index if not exists knowledge_sources_type_domain_idx on public.knowledge_sources (source_type, domain, status);
create index if not exists knowledge_sources_doc_idx on public.knowledge_sources (document_id, revision_id);
create index if not exists knowledge_chunks_source_idx on public.knowledge_chunks (knowledge_source_id, chunk_index);
create index if not exists knowledge_chunks_company_idx on public.knowledge_chunks (company_id);
create index if not exists knowledge_chunks_type_idx on public.knowledge_chunks (content_type);

-- 5. Row Level Security Multi-Tenant & Sources Globales Publiques -----------
alter table public.knowledge_sources enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.knowledge_audit_logs enable row level security;

-- Knowledge Sources
drop policy if exists knowledge_sources_select on public.knowledge_sources;
create policy knowledge_sources_select on public.knowledge_sources
  for select using (company_id is null or company_id = public.current_company_id());

drop policy if exists knowledge_sources_insert on public.knowledge_sources;
create policy knowledge_sources_insert on public.knowledge_sources
  for insert with check (company_id is null or company_id = public.current_company_id());

drop policy if exists knowledge_sources_update on public.knowledge_sources;
create policy knowledge_sources_update on public.knowledge_sources
  for update using (company_id is null or company_id = public.current_company_id());

drop policy if exists knowledge_sources_delete on public.knowledge_sources;
create policy knowledge_sources_delete on public.knowledge_sources
  for delete using (company_id is null or company_id = public.current_company_id());

-- Knowledge Chunks
drop policy if exists knowledge_chunks_select on public.knowledge_chunks;
create policy knowledge_chunks_select on public.knowledge_chunks
  for select using (company_id is null or company_id = public.current_company_id());

drop policy if exists knowledge_chunks_all on public.knowledge_chunks;
create policy knowledge_chunks_all on public.knowledge_chunks
  for all using (
    exists (
      select 1 from public.knowledge_sources s
      where s.id = knowledge_source_id and (s.company_id is null or s.company_id = public.current_company_id())
    )
  );

-- Knowledge Audit Logs
drop policy if exists knowledge_audit_logs_select on public.knowledge_audit_logs;
create policy knowledge_audit_logs_select on public.knowledge_audit_logs
  for select using (company_id is null or company_id = public.current_company_id());

drop policy if exists knowledge_audit_logs_insert on public.knowledge_audit_logs;
create policy knowledge_audit_logs_insert on public.knowledge_audit_logs
  for insert with check (company_id is null or company_id = public.current_company_id());
