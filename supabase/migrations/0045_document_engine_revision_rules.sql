-- ============================================================================
-- Migration 0045 : Règles de Révision & Activation Documentaire (Phase C)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Helper PL/pgSQL : Calcule le prochain code de révision (REV00 -> REV01 -> REV02)
create or replace function public.calculate_next_revision_code(p_current_code text)
returns text
language plpgsql
immutable
as $$
declare
  v_num integer;
begin
  if p_current_code is null or p_current_code = '' then
    return 'REV00';
  end if;
  
  -- Extrait les chiffres à la fin (ex: REV01 -> 1)
  v_num := substring(p_current_code from 'REV([0-9]+)')::integer;
  if v_num is null then
    return 'REV01';
  end if;
  
  return 'REV' || lpad((v_num + 1)::text, 2, '0');
end;
$$;

-- 2. Fonction transactionnelle : Passage d'une révision en "en_vigueur"
-- Retrograde automatiquement l'ancienne version en_vigueur vers "obsolete"
-- et synchronise la table documents principale.
create or replace function public.set_revision_in_vigueur(
  p_revision_id uuid,
  p_actor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rev record;
  v_doc record;
  v_actor_name text := 'Système';
begin
  -- 1. Verrouille et extrait la révision ciblée
  select * into v_rev
  from public.document_revisions
  where id = p_revision_id
  for update;

  if not found then
    raise exception 'Révision introuvable (%)', p_revision_id;
  end if;

  -- 2. Verrouille et extrait le document parent
  select * into v_doc
  from public.documents
  where id = v_rev.document_id
  for update;

  if not found then
    raise exception 'Document introuvable (%)', v_rev.document_id;
  end if;

  -- 3. Si un acteur est fourni, récupérer son nom
  if p_actor_id is not null then
    select full_name into v_actor_name
    from public.profiles
    where id = p_actor_id;
    if v_actor_name is null then
      v_actor_name := 'Utilisateur';
    end if;
  end if;

  -- 4. Rétrograder toute ancienne révision "en_vigueur" du même document vers "obsolete"
  update public.document_revisions
  set status = 'obsolete'
  where document_id = v_rev.document_id
    and status = 'en_vigueur'
    and id <> p_revision_id;

  -- 5. Activer la révision ciblée
  update public.document_revisions
  set status = 'en_vigueur'
  where id = p_revision_id;

  -- 6. Synchroniser les métadonnées sur le document principal
  update public.documents
  set status = 'en_vigueur',
      revision_code = v_rev.revision_code,
      version_major = v_rev.version_major,
      version_minor = v_rev.version_minor,
      storage_path = v_rev.storage_path,
      updated_at = now()
  where id = v_rev.document_id;

  -- 7. Logger l'événement d'historique immuable
  insert into public.document_history (
    company_id,
    document_id,
    revision_id,
    event_type,
    actor_id,
    actor_name,
    details
  ) values (
    v_doc.company_id,
    v_doc.id,
    v_rev.id,
    'status_changed',
    p_actor_id,
    v_actor_name,
    jsonb_build_object(
      'action', 'set_in_vigueur',
      'revision_code', v_rev.revision_code,
      'previous_status', v_rev.status,
      'new_status', 'en_vigueur'
    )
  );
end;
$$;

-- 3. Trigger pour interdire la suppression physique d'une révision si elle a des signatures
create or replace function public.prevent_signed_revision_deletion()
returns trigger
language plpgsql
as $$
declare
  v_signed_count integer;
begin
  select count(*) into v_signed_count
  from public.document_signatures
  where revision_id = old.id
    and signature_status = 'signed';

  if v_signed_count > 0 then
    raise exception 'Impossible de supprimer la révision % : elle contient des signatures effectives immuables.', old.revision_code;
  end if;

  return old;
end;
$$;

drop trigger if exists trg_prevent_signed_revision_deletion on public.document_revisions;
create trigger trg_prevent_signed_revision_deletion
  before delete on public.document_revisions
  for each row execute function public.prevent_signed_revision_deletion();
