-- ============================================================================
-- Migration 0041 : Extension du type énuméré action_status (Module CAPA Phase 1)
-- QHSE Duo Sénégal
-- ============================================================================

alter type public.action_status add value if not exists 'brouillon';
alter type public.action_status add value if not exists 'ouverte';
alter type public.action_status add value if not exists 'bloquee';
alter type public.action_status add value if not exists 'a_verifier';
alter type public.action_status add value if not exists 'cloturee';
alter type public.action_status add value if not exists 'rejetee';
alter type public.action_status add value if not exists 'reouverte';
