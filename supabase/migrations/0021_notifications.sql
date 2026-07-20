-- ============================================================================
-- Migration 0021 : Notifications temps réel
-- QHSE Duo Sénégal
-- ============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null default '',
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.notifications is 'Notifications utilisateur, générées automatiquement par triggers.';

alter table public.notifications enable row level security;

create policy notifications_select_own
  on public.notifications for select
  using (auth.uid() = user_id);

create policy notifications_update_own
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Aucune policy d'insertion pour les utilisateurs : les notifications ne
-- sont créées que par les triggers ci-dessous (fonctions SECURITY DEFINER,
-- qui contournent la RLS).

create index notifications_user_id_idx on public.notifications (user_id, created_at desc);

-- 1. Incident assigné -----------------------------------------------------------------

create function public.notify_incident_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to is not null and new.assigned_to is distinct from old.assigned_to then
    insert into public.notifications (user_id, title, message, link)
    values (new.assigned_to, 'Incident qui vous est assigné', new.title, '/incidents/' || new.id);
  end if;
  return new;
end;
$$;

create trigger trg_notify_incident_assigned
  after update on public.incidents
  for each row execute function public.notify_incident_assigned();

-- 2. Action corrective assignée ---------------------------------------------------------

create function public.notify_action_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, message, link)
  select new.responsable_id, 'Action corrective qui vous est assignée', new.description, '/incidents/' || new.incident_id;
  return new;
end;
$$;

create trigger trg_notify_action_assigned
  after insert on public.actions_correctives
  for each row execute function public.notify_action_assigned();

-- 3. Nouvelle politique QHSE publiée -----------------------------------------------------

create function public.notify_policy_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active then
    insert into public.notifications (user_id, title, message, link)
    select id, 'Nouvelle politique QHSE à lire', new.title, '/politique'
    from public.profiles
    where status = 'active';
  end if;
  return new;
end;
$$;

create trigger trg_notify_policy_published
  after insert on public.qhse_policies
  for each row execute function public.notify_policy_published();

-- 4. Realtime ---------------------------------------------------------------------------
-- Permet au client de s'abonner aux nouvelles notifications sans recharger
-- la page (composant components/notifications/notification-bell.tsx).

alter publication supabase_realtime add table public.notifications;
