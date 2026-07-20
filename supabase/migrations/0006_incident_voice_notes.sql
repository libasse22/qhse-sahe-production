-- ============================================================================
-- Migration 0006 : Messages vocaux joints aux incidents
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Table incident_voice_notes -----------------------------------------------
-- Même logique que incident_photos (migration 0004) : métadonnées en base,
-- fichier réel dans le bucket Storage privé 'incident-voice-notes', chemin
-- "{incident_id}/{fichier}".

create table public.incident_voice_notes (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  storage_path text not null unique,
  duration_seconds integer,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.incident_voice_notes is
  'Métadonnées des messages vocaux joints aux incidents (fichiers réels dans le bucket Storage incident-voice-notes).';

alter table public.incident_voice_notes enable row level security;

create policy incident_voice_notes_select
  on public.incident_voice_notes for select
  using (
    public.is_qhse_or_admin()
    or exists (
      select 1 from public.incidents
      where id = incident_id
        and (reported_by = auth.uid() or assigned_to = auth.uid())
    )
  );

create policy incident_voice_notes_insert
  on public.incident_voice_notes for insert
  with check (
    auth.uid() = uploaded_by
    and (
      public.is_qhse_or_admin()
      or exists (select 1 from public.incidents where id = incident_id and reported_by = auth.uid())
    )
  );

create policy incident_voice_notes_delete
  on public.incident_voice_notes for delete
  using (auth.uid() = uploaded_by or public.is_qhse_or_admin());

create index incident_voice_notes_incident_id_idx on public.incident_voice_notes (incident_id);

-- 2. Rendre la description texte optionnelle -------------------------------------
-- Un ouvrier doit pouvoir envoyer uniquement un message vocal, sans texte.

alter table public.incidents alter column description drop not null;
alter table public.incidents alter column description set default '';

-- 3. Bucket de stockage privé -----------------------------------------------------

insert into storage.buckets (id, name, public)
values ('incident-voice-notes', 'incident-voice-notes', false)
on conflict (id) do nothing;

-- 4. Policies sur storage.objects --------------------------------------------------

create policy incident_voice_storage_select
  on storage.objects for select
  using (
    bucket_id = 'incident-voice-notes'
    and (
      public.is_qhse_or_admin()
      or exists (
        select 1 from public.incidents
        where id::text = (storage.foldername(name))[1]
          and (reported_by = auth.uid() or assigned_to = auth.uid())
      )
    )
  );

create policy incident_voice_storage_insert
  on storage.objects for insert
  with check (
    bucket_id = 'incident-voice-notes'
    and exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
  );

create policy incident_voice_storage_delete
  on storage.objects for delete
  using (
    bucket_id = 'incident-voice-notes'
    and (public.is_qhse_or_admin() or owner_id = auth.uid()::text)
  );
