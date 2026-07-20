-- ============================================================================
-- Migration 0014 : Gestion documentaire (ISO 9001 §7.5)
-- QHSE Duo Sénégal
-- ============================================================================

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Général',
  storage_path text not null unique,
  version integer not null default 1,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.documents is 'Bibliothèque documentaire QHSE (procédures, formulaires, enregistrements) — fichiers dans le bucket Storage qhse-documents.';

alter table public.documents enable row level security;

-- Tout utilisateur actif peut consulter/télécharger ; seuls QHSE/admin gèrent
-- le dépôt et la suppression.
create policy documents_select_active
  on public.documents for select
  using (exists (select 1 from public.profiles where id = auth.uid() and status = 'active'));

create policy documents_write_qhse
  on public.documents for insert
  with check (public.is_qhse_or_admin() and uploaded_by = auth.uid());

create policy documents_delete_qhse
  on public.documents for delete
  using (public.is_qhse_or_admin());

create index documents_category_idx on public.documents (category);

-- Bucket de stockage privé -----------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('qhse-documents', 'qhse-documents', false)
on conflict (id) do nothing;

create policy qhse_documents_storage_select
  on storage.objects for select
  using (
    bucket_id = 'qhse-documents'
    and exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
  );

create policy qhse_documents_storage_insert
  on storage.objects for insert
  with check (bucket_id = 'qhse-documents' and public.is_qhse_or_admin());

create policy qhse_documents_storage_delete
  on storage.objects for delete
  using (bucket_id = 'qhse-documents' and public.is_qhse_or_admin());
