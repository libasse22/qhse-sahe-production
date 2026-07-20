-- ============================================================================
-- Migration 0013 : Revue de direction (ISO 9001 §9.3 / 14001 §9.3 / 45001 §9.3)
-- QHSE Duo Sénégal
-- ============================================================================

create table public.management_reviews (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  review_date date not null,
  summary text not null default '',
  decisions text not null default '',
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.management_reviews is 'Comptes-rendus de revue de direction : synthèse des indicateurs QHSE et décisions prises.';

alter table public.management_reviews enable row level security;

create policy management_reviews_all_qhse
  on public.management_reviews for all
  using (public.is_qhse_or_admin())
  with check (public.is_qhse_or_admin());

create index management_reviews_review_date_idx on public.management_reviews (review_date);
