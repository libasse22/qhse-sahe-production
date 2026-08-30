-- ============================================================================
-- Migration 0038 : Confirmation de Réception et Traçabilité QR Code des EPI
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Champs de confirmation et traçabilité sur epi_assignments -------------------
alter table public.epi_assignments
  add column if not exists confirmation_code text default LPAD(floor(random() * 900000 + 100000)::text, 6, '0'),
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by_user boolean default false,
  add column if not exists signature_url text default '';

-- 2. Fonction RPC publique pour le scan terrain d'un EPI -----------------------
create or replace function public.get_public_epi_assignment(p_id uuid)
returns table (
  id uuid,
  catalog_name text,
  category text,
  iso_norm text,
  recipient_name text,
  assigned_at timestamptz,
  renewal_due_at timestamptz,
  condition_state text,
  status text,
  confirmed_at timestamptz,
  serial_number text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    a.id,
    c.name as catalog_name,
    c.category,
    c.iso_norm,
    p.full_name as recipient_name,
    a.assigned_at,
    a.renewal_due_at,
    a.condition_state,
    a.status,
    a.confirmed_at,
    a.serial_number
  from public.epi_assignments a
  join public.epi_catalog c on c.id = a.catalog_id
  join public.profiles p on p.id = a.recipient_id
  where a.id = p_id;
end;
$$;

comment on function public.get_public_epi_assignment(uuid) is 'Permet la vérification terrain par scan QR de l''attribution d''un EPI et de sa confirmation par l''employé.';

grant execute on function public.get_public_epi_assignment(uuid) to anon, authenticated;
