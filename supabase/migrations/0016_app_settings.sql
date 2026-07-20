-- ============================================================================
-- Migration 0016 : Paramètres d'identité de l'application (marque blanche)
-- QHSE Duo Sénégal
-- ============================================================================

-- Table "singleton" : une seule ligne, id toujours = true. Permet à chaque
-- entreprise qui déploie l'application de personnaliser son nom et son logo
-- sans toucher au code.

create table public.app_settings (
  id boolean primary key default true check (id),
  app_name text not null default 'QHSE Duo Sénégal',
  logo_storage_path text,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is
  'Réglages d''identité de l''application (nom, logo) — une seule ligne, personnalisable par l''admin.';

create trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

insert into public.app_settings (id, app_name) values (true, 'QHSE Duo Sénégal');

-- Lecture publique (y compris non connecté : pages de connexion/inscription
-- doivent afficher le nom et le logo de l'entreprise). Seul un admin peut
-- modifier.
alter table public.app_settings enable row level security;

create policy app_settings_select_public
  on public.app_settings for select
  using (true);

create policy app_settings_update_admin
  on public.app_settings for update
  using (public.is_admin())
  with check (public.is_admin());

-- Bucket public : le logo doit être affichable sans authentification sur les
-- pages de connexion/inscription.
insert into storage.buckets (id, name, public)
values ('app-branding', 'app-branding', true)
on conflict (id) do nothing;

create policy app_branding_storage_select
  on storage.objects for select
  using (bucket_id = 'app-branding');

create policy app_branding_storage_insert
  on storage.objects for insert
  with check (bucket_id = 'app-branding' and public.is_admin());

create policy app_branding_storage_delete
  on storage.objects for delete
  using (bucket_id = 'app-branding' and public.is_admin());
