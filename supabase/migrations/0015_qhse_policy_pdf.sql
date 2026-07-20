-- ============================================================================
-- Migration 0015 : Politique QHSE — pièce jointe PDF
-- QHSE Duo Sénégal
-- ============================================================================

-- Le contenu texte devient optionnel : une politique peut être publiée
-- uniquement sous forme de document PDF (mis en page officiellement,
-- signé...), avec ou sans résumé textuel affiché en complément.

alter table public.qhse_policies alter column content drop not null;
alter table public.qhse_policies alter column content set default '';
alter table public.qhse_policies add column pdf_storage_path text;

comment on column public.qhse_policies.pdf_storage_path is
  'Chemin du PDF dans le bucket Storage qhse-documents (réutilisé du module Documents), optionnel.';
