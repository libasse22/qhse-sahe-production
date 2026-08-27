-- ============================================================================
-- Migration 0023 : Messagerie & Règlement intérieur
-- QHSE Duo Sénégal
-- Tables manquantes pour le code déjà présent (composants/services écrits
-- par un autre outil, tables jamais créées côté base de données).
-- ============================================================================

-- 1. Colonne manquante sur profiles ---------------------------------------------------

alter table public.profiles add column if not exists avatar_url text;

-- 2. Messagerie ------------------------------------------------------------------------

create type public.conversation_type as enum ('direct', 'group', 'incident');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null default 'direct',
  title text,
  incident_id uuid references public.incidents (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete restrict,
  content text,
  created_at timestamptz not null default now()
);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  created_at timestamptz not null default now()
);

create index conversation_participants_user_id_idx on public.conversation_participants (user_id);
create index messages_conversation_id_idx on public.messages (conversation_id, created_at);
create index message_attachments_message_id_idx on public.message_attachments (message_id);
create index conversations_incident_id_idx on public.conversations (incident_id);

-- Fonction utilitaire : l'utilisateur courant participe-t-il à cette conversation ?
create function public.is_conv_participant(conv_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = conv_id and user_id = auth.uid()
  );
$$;

-- Crée atomiquement une conversation + ses participants (évite le problème
-- "il faut être participant pour s'ajouter comme participant"). Vérifie que
-- l'appelant fait bien partie de la liste fournie.
create function public.create_conversation_with_participants(
  p_type text,
  p_title text,
  p_incident_id uuid,
  p_participant_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not (v_uid = any(p_participant_ids)) then
    raise exception 'not authorized';
  end if;

  insert into public.conversations (type, title, incident_id, created_by)
  values (p_type::conversation_type, p_title, p_incident_id, v_uid)
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  select v_conversation_id, unnest(p_participant_ids);

  return v_conversation_id;
end;
$$;

grant execute on function public.create_conversation_with_participants to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;

create policy conversations_select
  on public.conversations for select
  using (public.is_conv_participant(id));

-- Nécessaire pour le chemin "conversation liée à un incident" qui insère
-- directement (hors RPC) : le créateur peut créer sa propre conversation.
create policy conversations_insert
  on public.conversations for insert
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
  );

-- sendMessage() met à jour updated_at à chaque nouveau message.
create policy conversations_update
  on public.conversations for update
  using (public.is_conv_participant(id))
  with check (true);

create policy conversation_participants_select
  on public.conversation_participants for select
  using (public.is_conv_participant(conversation_id));

-- Couvre 3 cas : s'ajouter soi-même, être invité par un participant déjà
-- présent, ou être ajouté en bloc par le créateur au moment de la création
-- (getOrCreateIncidentConversation insère plusieurs lignes en une requête).
create policy conversation_participants_insert
  on public.conversation_participants for insert
  with check (
    user_id = auth.uid()
    or public.is_conv_participant(conversation_id)
    or exists (select 1 from public.conversations where id = conversation_id and created_by = auth.uid())
  );

create policy conversation_participants_update
  on public.conversation_participants for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy conversation_participants_delete
  on public.conversation_participants for delete
  using (user_id = auth.uid());

create policy messages_select
  on public.messages for select
  using (public.is_conv_participant(conversation_id));

create policy messages_insert
  on public.messages for insert
  with check (sender_id = auth.uid() and public.is_conv_participant(conversation_id));

create policy messages_delete
  on public.messages for delete
  using (sender_id = auth.uid());

create policy message_attachments_select
  on public.message_attachments for select
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_conv_participant(m.conversation_id)
    )
  );

create policy message_attachments_insert
  on public.message_attachments for insert
  with check (
    exists (select 1 from public.messages m where m.id = message_id and m.sender_id = auth.uid())
  );

-- Bucket de stockage privé pour les pièces jointes de messages -------------------------

insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', false)
on conflict (id) do nothing;

create policy message_attachments_storage_select
  on storage.objects for select
  using (
    bucket_id = 'message-attachments'
    and exists (
      select 1 from public.messages m
      where m.id::text = (storage.foldername(name))[1]
        and public.is_conv_participant(m.conversation_id)
    )
  );

create policy message_attachments_storage_insert
  on storage.objects for insert
  with check (
    bucket_id = 'message-attachments'
    and exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
  );

create policy message_attachments_storage_delete
  on storage.objects for delete
  using (bucket_id = 'message-attachments' and owner_id = auth.uid()::text);

alter publication supabase_realtime add table public.messages;

-- 3. Règlement intérieur ----------------------------------------------------------------

create table public.internal_regulations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  version integer not null,
  is_active boolean not null default true,
  pdf_storage_path text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.internal_regulations is 'Versions successives du règlement intérieur (texte et/ou PDF).';

create index internal_regulations_is_active_idx on public.internal_regulations (is_active);

insert into public.permissions (code, label, category) values
  ('regulation.publish', 'Publier le règlement intérieur', 'Règlement intérieur');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name in ('Administrateur', 'Manager QHSE') and p.code = 'regulation.publish';

alter table public.internal_regulations enable row level security;

create policy internal_regulations_select
  on public.internal_regulations for select
  using (exists (select 1 from public.profiles where id = auth.uid() and status = 'active'));

create policy internal_regulations_insert
  on public.internal_regulations for insert
  with check (public.has_permission('regulation.publish') and created_by = auth.uid());

create policy internal_regulations_update
  on public.internal_regulations for update
  using (public.has_permission('regulation.publish'))
  with check (public.has_permission('regulation.publish'));

-- Le règlement intérieur et la politique QHSE partagent le même bucket
-- 'qhse-documents' (créé en migration 0014) pour leurs PDF ; la policy
-- d'upload de ce bucket ne connaissait jusqu'ici que 'documents.manage'.
-- On l'élargit pour accepter aussi les permissions dédiées à chacun.
drop policy if exists qhse_documents_storage_insert on storage.objects;
create policy qhse_documents_storage_insert
  on storage.objects for insert
  with check (
    bucket_id = 'qhse-documents'
    and (
      public.has_permission('documents.manage')
      or public.has_permission('policy.publish')
      or public.has_permission('regulation.publish')
    )
  );