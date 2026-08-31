-- ============================================================================
-- Migration 0040 : Subscriptions Web Push Natives (Multi-Tenant & RLS)
-- QHSE Duo Sénégal
-- ============================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

comment on table public.push_subscriptions is 'Abonnements Web Push navigateurs (APNs / FCM) isolés par utilisateur et entreprise.';

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
create index if not exists push_subscriptions_company_id_idx on public.push_subscriptions (company_id);

alter table public.push_subscriptions enable row level security;

-- Policies RLS : Un utilisateur ne peut voir, créer, modifier ou supprimer que ses propres abonnements Push.
create policy push_sub_select_own on public.push_subscriptions
  for select using (auth.uid() = user_id);

create policy push_sub_insert_own on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

create policy push_sub_update_own on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy push_sub_delete_own on public.push_subscriptions
  for delete using (auth.uid() = user_id);
