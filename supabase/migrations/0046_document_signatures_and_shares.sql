-- ============================================================================
-- Migration 0046 : Moteur de Signatures, Access Externe & QR (Phase E)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Permettre l'accès public en lecture aux documents partagés via token valide
drop policy if exists document_external_shares_public_read on public.document_external_shares;
create policy document_external_shares_public_read
  on public.document_external_shares for select
  using (
    revoked_at is null
    and expires_at > now()
  );

-- 2. Fonction transactionnelle pour initier une demande de signature
create or replace function public.request_document_signature(
  p_document_id uuid,
  p_revision_id uuid,
  p_signer_name text,
  p_signer_role text default '',
  p_signer_email text default '',
  p_signer_id uuid default null,
  p_signature_mode text default 'digital_handwritten',
  p_step_order integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_sig_id uuid;
  v_actor_name text := 'Responsable GED';
begin
  select company_id into v_company_id
  from public.documents
  where id = p_document_id;

  if v_company_id is null then
    raise exception 'Document introuvable (%)', p_document_id;
  end if;

  insert into public.document_signatures (
    company_id,
    document_id,
    revision_id,
    signer_type,
    signer_id,
    signer_name,
    signer_role,
    signer_email,
    signature_mode,
    signature_status,
    step_order
  ) values (
    v_company_id,
    p_document_id,
    p_revision_id,
    case when p_signer_id is not null then 'internal_user' else 'external' end,
    p_signer_id,
    p_signer_name,
    p_signer_role,
    p_signer_email,
    p_signature_mode,
    'pending',
    p_step_order
  )
  returning id into v_sig_id;

  -- Mettre à jour le statut du document en attente de signature
  update public.documents
  set status = 'en_attente_signature',
      updated_at = now()
  where id = p_document_id;

  -- Mettre à jour la révision
  update public.document_revisions
  set status = 'en_attente_signature'
  where id = p_revision_id;

  -- Logging historique
  insert into public.document_history (
    company_id,
    document_id,
    revision_id,
    event_type,
    actor_name,
    details
  ) values (
    v_company_id,
    p_document_id,
    p_revision_id,
    'signature_requested',
    v_actor_name,
    jsonb_build_object(
      'signer_name', p_signer_name,
      'signer_role', p_signer_role,
      'step_order', p_step_order,
      'signature_mode', p_signature_mode
    )
  );

  return v_sig_id;
end;
$$;

-- 3. Fonction transactionnelle pour exécuter une signature (Manuscrite / Papier)
create or replace function public.execute_document_signature(
  p_signature_id uuid,
  p_signature_storage_path text default null,
  p_signed_ip text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sig record;
  v_pending_count integer;
begin
  select * into v_sig
  from public.document_signatures
  where id = p_signature_id
  for update;

  if not found then
    raise exception 'Demande de signature introuvable (%)', p_signature_id;
  end if;

  -- Marquer comme signée
  update public.document_signatures
  set signature_status = 'signed',
      signature_storage_path = coalesce(p_signature_storage_path, signature_storage_path),
      signed_at = now(),
      signed_ip = p_signed_ip
  where id = p_signature_id;

  -- Compter s'il reste d'autres signatures en attente pour cette révision
  select count(*) into v_pending_count
  from public.document_signatures
  where revision_id = v_sig.revision_id
    and signature_status = 'pending';

  -- Si toutes les signatures de cette étape sont terminées, passer en approuvé / en_vigueur
  if v_pending_count = 0 then
    perform public.set_revision_in_vigueur(v_sig.revision_id, v_sig.signer_id);
  end if;

  -- Log historique immuable
  insert into public.document_history (
    company_id,
    document_id,
    revision_id,
    event_type,
    actor_id,
    actor_name,
    details
  ) values (
    v_sig.company_id,
    v_sig.document_id,
    v_sig.revision_id,
    'signed',
    v_sig.signer_id,
    v_sig.signer_name,
    jsonb_build_object(
      'signature_id', p_signature_id,
      'signature_mode', v_sig.signature_mode,
      'signed_storage_path', p_signature_storage_path
    )
  );
end;
$$;
