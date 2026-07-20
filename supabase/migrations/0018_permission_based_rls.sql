-- ============================================================================
-- Migration 0018 : permissions granulaires dans les policies RLS
-- QHSE Duo Sénégal
-- ============================================================================
-- Jusqu'ici, les policies "QHSE" reposaient sur is_qhse_or_admin(), qui teste
-- uniquement l'enum profiles.role ('admin'/'manager_qhse'). Un rôle
-- personnalisé rattaché à l'espace manager_qhse héritait donc de TOUS les
-- droits QHSE, quelles que soient les permissions cochées pour ce rôle.
--
-- Cette migration remplace ces policies par des vérifications via
-- has_permission(code). Aucune régression : les rôles système Manager QHSE
-- et Administrateur possèdent déjà (migration 0017, seed) exactement les
-- permissions nécessaires, donc leur comportement reste identique. Seuls les
-- rôles personnalisés sont désormais réellement restreints à ce qui a été
-- coché pour eux.
-- ============================================================================

-- 1. Incidents ------------------------------------------------------------------------

drop policy incidents_select_qhse on public.incidents;
create policy incidents_select_qhse
  on public.incidents for select
  using (public.has_permission('incidents.manage_all'));

drop policy incidents_update_qhse on public.incidents;
create policy incidents_update_qhse
  on public.incidents for update
  using (public.has_permission('incidents.manage_all'))
  with check (true);

-- 2. Actions correctives ---------------------------------------------------------------

drop policy actions_select_qhse on public.actions_correctives;
create policy actions_select_qhse
  on public.actions_correctives for select
  using (public.has_permission('actions.manage'));

drop policy actions_insert_qhse on public.actions_correctives;
create policy actions_insert_qhse
  on public.actions_correctives for insert
  with check (public.has_permission('actions.manage'));

drop policy actions_update_qhse on public.actions_correctives;
create policy actions_update_qhse
  on public.actions_correctives for update
  using (public.has_permission('actions.manage'))
  with check (true);

drop policy actions_delete_qhse on public.actions_correctives;
create policy actions_delete_qhse
  on public.actions_correctives for delete
  using (public.has_permission('actions.manage'));

-- 3. Audits -------------------------------------------------------------------------

drop policy audits_all_qhse on public.audits;
create policy audits_all_qhse
  on public.audits for all
  using (public.has_permission('audits.manage'))
  with check (public.has_permission('audits.manage'));

drop policy audit_findings_all_qhse on public.audit_findings;
create policy audit_findings_all_qhse
  on public.audit_findings for all
  using (public.has_permission('audits.manage'))
  with check (public.has_permission('audits.manage'));

-- 4. Risques --------------------------------------------------------------------------

drop policy risks_all_qhse on public.risks;
create policy risks_all_qhse
  on public.risks for all
  using (public.has_permission('risks.manage'))
  with check (public.has_permission('risks.manage'));

-- 5. Objectifs & indicateurs ------------------------------------------------------------

drop policy objectives_write_qhse on public.qhse_objectives;
create policy objectives_write_qhse
  on public.qhse_objectives for all
  using (public.has_permission('objectives.manage'))
  with check (public.has_permission('objectives.manage'));

-- 6. Parties intéressées & conformité -----------------------------------------------------

drop policy interested_parties_all_qhse on public.interested_parties;
create policy interested_parties_all_qhse
  on public.interested_parties for all
  using (public.has_permission('compliance.manage'))
  with check (public.has_permission('compliance.manage'));

drop policy compliance_obligations_all_qhse on public.compliance_obligations;
create policy compliance_obligations_all_qhse
  on public.compliance_obligations for all
  using (public.has_permission('compliance.manage'))
  with check (public.has_permission('compliance.manage'));

-- 7. Revues de direction ----------------------------------------------------------------

drop policy management_reviews_all_qhse on public.management_reviews;
create policy management_reviews_all_qhse
  on public.management_reviews for all
  using (public.has_permission('reviews.manage'))
  with check (public.has_permission('reviews.manage'));

-- 8. Documents (table + storage) ---------------------------------------------------------

drop policy documents_write_qhse on public.documents;
create policy documents_write_qhse
  on public.documents for insert
  with check (public.has_permission('documents.manage') and uploaded_by = auth.uid());

drop policy documents_delete_qhse on public.documents;
create policy documents_delete_qhse
  on public.documents for delete
  using (public.has_permission('documents.manage'));

drop policy qhse_documents_storage_insert on storage.objects;
create policy qhse_documents_storage_insert
  on storage.objects for insert
  with check (bucket_id = 'qhse-documents' and public.has_permission('documents.manage'));

drop policy qhse_documents_storage_delete on storage.objects;
create policy qhse_documents_storage_delete
  on storage.objects for delete
  using (bucket_id = 'qhse-documents' and public.has_permission('documents.manage'));

-- 9. Politique QHSE ---------------------------------------------------------------------

drop policy qhse_policies_insert_qhse on public.qhse_policies;
create policy qhse_policies_insert_qhse
  on public.qhse_policies for insert
  with check (public.has_permission('policy.publish') and created_by = auth.uid());

-- 10. Paramètres de l'application (nom, logo) ---------------------------------------------

drop policy app_settings_update_admin on public.app_settings;
create policy app_settings_update_admin
  on public.app_settings for update
  using (public.has_permission('settings.manage'))
  with check (public.has_permission('settings.manage'));

drop policy app_branding_storage_insert on storage.objects;
create policy app_branding_storage_insert
  on storage.objects for insert
  with check (bucket_id = 'app-branding' and public.has_permission('settings.manage'));

drop policy app_branding_storage_delete on storage.objects;
create policy app_branding_storage_delete
  on storage.objects for delete
  using (bucket_id = 'app-branding' and public.has_permission('settings.manage'));

-- 11. Utilisateurs -----------------------------------------------------------------------
-- La policy passe désormais par has_permission('users.manage') plutôt que le
-- strict is_admin(). Il faut donc que le trigger de protection des champs
-- sensibles (migration 0017) accepte le même critère, sinon un rôle
-- personnalisé avec cette permission verrait ses changements de role/role_id
-- silencieusement annulés par le trigger alors que la policy les autorise.

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or public.has_permission('users.manage')) then
    new.role := old.role;
    new.status := old.status;
    new.role_id := old.role_id;
    new.company_id := old.company_id;
    new.site_id := old.site_id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop policy profiles_update_admin on public.profiles;
create policy profiles_update_admin
  on public.profiles for update
  using (public.has_permission('users.manage'))
  with check (true);

-- 12. Rôles & permissions elles-mêmes -----------------------------------------------------

drop policy roles_insert_admin on public.roles;
create policy roles_insert_admin
  on public.roles for insert
  with check (public.has_permission('roles.manage'));

drop policy roles_update_admin on public.roles;
create policy roles_update_admin
  on public.roles for update
  using (public.has_permission('roles.manage') and is_system = false)
  with check (public.has_permission('roles.manage'));

drop policy roles_delete_admin on public.roles;
create policy roles_delete_admin
  on public.roles for delete
  using (public.has_permission('roles.manage') and is_system = false);

drop policy role_permissions_write_admin on public.role_permissions;
create policy role_permissions_write_admin
  on public.role_permissions for all
  using (
    public.has_permission('roles.manage')
    and exists (select 1 from public.roles where id = role_id and is_system = false)
  )
  with check (
    public.has_permission('roles.manage')
    and exists (select 1 from public.roles where id = role_id and is_system = false)
  );

-- Protection : le trigger protect_profile_fields (migration 0017) empêche déjà
-- qu'un utilisateur non-admin ne modifie son propre role_id — nécessaire ici
-- car la policy_update_admin ci-dessus n'est plus limitée au strict is_admin().
-- La colonne role_id reste donc uniquement modifiable par has_permission('users.manage'),
-- jamais par soi-même, quel que soit le rôle courant.
