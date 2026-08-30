-- ============================================================================
-- Migration 0035 : Fonction RPC publique pour le scan QR Code d'équipement
-- QHSE Duo Sénégal
-- ============================================================================

create or replace function public.get_public_equipment(p_id uuid)
returns table (
  id uuid,
  name text,
  category text,
  serial_number text,
  site_name text,
  status public.equipment_status,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    e.id,
    e.name,
    e.category,
    e.serial_number,
    s.name as site_name,
    e.status,
    e.created_at
  from public.equipment e
  left join public.sites s on s.id = e.site_id
  where e.id = p_id;
end;
$$;

comment on function public.get_public_equipment(uuid) is 'Permet la récupération sécurisée et limitée des données publiques d''un équipement scanné via QR code.';

grant execute on function public.get_public_equipment(uuid) to anon, authenticated;
