-- ============================================================================
-- Migration 0039 : Realtime Triggers & Web Push Notifications
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Publications Realtime Supabase ------------------------------------------
alter publication supabase_realtime add table public.incidents;
alter publication supabase_realtime add table public.internal_regulations;

-- 2. Trigger Notification sur Nouveau Message ---------------------------------
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, message, link)
  select
    cp.user_id,
    '💬 Nouveau message dans la discussion',
    coalesce(left(new.content, 100), 'Nouveau message reçu'),
    '/messagerie/' || new.conversation_id
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.user_id <> new.sender_id;
  return new;
end;
$$;

drop trigger if exists trg_notify_new_message on public.messages;
create trigger trg_notify_new_message
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- 3. Trigger Notification sur Nouvel Incident ----------------------------------
create or replace function public.notify_new_incident()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, message, link)
  select
    p.id,
    '🚨 Nouvel incident signalé',
    'Lieu : ' || coalesce(new.location, 'Terrain') || ' — ' || coalesce(left(new.description, 80), 'Signalement QHSE'),
    '/incidents/' || new.id
  from public.profiles p
  where p.status = 'active';
  return new;
end;
$$;

drop trigger if exists trg_notify_new_incident on public.incidents;
create trigger trg_notify_new_incident
  after insert on public.incidents
  for each row execute function public.notify_new_incident();
