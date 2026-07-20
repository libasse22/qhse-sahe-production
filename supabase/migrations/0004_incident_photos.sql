-- ============================================================================
-- Migration 0004 : Photos jointes aux incidents (Module 6)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Table incident_photos ----------------------------------------------------------
-- storage_path suit la convention "{incident_id}/{fichier}" dans le bucket
-- 'incident-photos' (privé), ce qui permet aux policies Storage ci-dessous de
-- retrouver l'incident concerné via storage.foldername(name).

create table public.incident_photos (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  storage_path text not null unique,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.incident_photos is
  'Métadonnées des photos jointes aux incidents (fichiers réels dans le bucket Storage incident-photos).';

alter table public.incident_photos enable row level security;

create policy incident_photos_select
  on public.incident_photos for select
  using (
    public.is_qhse_or_admin()
    or exists (
      select 1 from public.incidents
      where id = incident_id
        and (reported_by = auth.uid() or assigned_to = auth.uid())
    )
  );

create policy incident_photos_insert
  on public.incident_photos for insert
  with check (
    auth.uid() = uploaded_by
    and (
      public.is_qhse_or_admin()
      or exists (
        select 1 from public.incidents where id = incident_id and reported_by = auth.uid()
      )
    )
  );

create policy incident_photos_delete
  on public.incident_photos for delete
  using (auth.uid() = uploaded_by or public.is_qhse_or_admin());

create index incident_photos_incident_id_idx on public.incident_photos (incident_id);

-- 2. Bucket de stockage privé --------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('incident-photos', 'incident-photos', false)
on conflict (id) do nothing;

-- 3. Policies sur storage.objects ----------------------------------------------------
-- Chemin attendu pour chaque fichier : "{incident_id}/{nom_fichier}".

create policy incident_photos_storage_select
  on storage.objects for select
  using (
    bucket_id = 'incident-photos'
    and (
      public.is_qhse_or_admin()
      or exists (
        select 1 from public.incidents
        where id::text = (storage.foldername(name))[1]
          and (reported_by = auth.uid() or assigned_to = auth.uid())
      )
    )
  );

create policy incident_photos_storage_insert
  on storage.objects for insert
  with check (
    bucket_id = 'incident-photos'
    and exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
  );

create policy incident_photos_storage_delete
  on storage.objects for delete
  using (
    bucket_id = 'incident-photos'
    and (public.is_qhse_or_admin() or owner_id = auth.uid()::text)
  );
