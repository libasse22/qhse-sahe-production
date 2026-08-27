-- ============================================================================
-- Migration 0027 : Policies RLS Multi-Entreprise (Isolation Stricte)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Profiles ----------------------------------------------------------------
drop policy if exists profiles_select_active_users on public.profiles;
create policy profiles_select_active_users
  on public.profiles for select
  using (
    status = 'active'
    and (company_id = public.current_company_id() or public.is_admin())
    and public.is_active_user()
  );

-- 2. Companies & Sites --------------------------------------------------------
drop policy if exists companies_select_active on public.companies;
create policy companies_select_active
  on public.companies for select
  using (
    id = public.current_company_id() or public.is_admin()
  );

drop policy if exists sites_select_active on public.sites;
create policy sites_select_active
  on public.sites for select
  using (
    company_id = public.current_company_id() or public.is_admin()
  );

drop policy if exists sites_write_admin on public.sites;
create policy sites_write_admin
  on public.sites for all
  using (
    company_id = public.current_company_id() and public.has_permission('settings.manage')
  )
  with check (
    company_id = public.current_company_id() and public.has_permission('settings.manage')
  );

-- 3. Incidents ----------------------------------------------------------------
drop policy if exists incidents_select_own on public.incidents;
drop policy if exists incidents_select_qhse on public.incidents;
create policy incidents_select_multi_company
  on public.incidents for select
  using (
    company_id = public.current_company_id()
    and (reported_by = auth.uid() or assigned_to = auth.uid() or public.has_permission('incidents.manage_all'))
  );

drop policy if exists incidents_insert_active on public.incidents;
drop policy if exists incidents_insert_authenticated on public.incidents;
create policy incidents_insert_multi_company
  on public.incidents for insert
  with check (
    company_id = public.current_company_id()
    and reported_by = auth.uid()
  );

drop policy if exists incidents_update_own on public.incidents;
drop policy if exists incidents_update_qhse on public.incidents;
create policy incidents_update_multi_company
  on public.incidents for update
  using (
    company_id = public.current_company_id()
    and (reported_by = auth.uid() or assigned_to = auth.uid() or public.has_permission('incidents.manage_all'))
  )
  with check (
    company_id = public.current_company_id()
  );

-- 4. Actions correctives ------------------------------------------------------
drop policy if exists actions_select_responsable on public.actions_correctives;
drop policy if exists actions_select_assigned on public.actions_correctives;
drop policy if exists actions_select_qhse on public.actions_correctives;
create policy actions_select_multi_company
  on public.actions_correctives for select
  using (
    company_id = public.current_company_id()
    and (responsable_id = auth.uid() or public.has_permission('actions.manage'))
  );

drop policy if exists actions_insert_qhse on public.actions_correctives;
create policy actions_insert_multi_company
  on public.actions_correctives for insert
  with check (
    company_id = public.current_company_id()
    and public.has_permission('actions.manage')
  );

drop policy if exists actions_update_responsable on public.actions_correctives;
drop policy if exists actions_update_assigned on public.actions_correctives;
drop policy if exists actions_update_qhse on public.actions_correctives;
create policy actions_update_multi_company
  on public.actions_correctives for update
  using (
    company_id = public.current_company_id()
    and (responsable_id = auth.uid() or public.has_permission('actions.manage'))
  )
  with check (
    company_id = public.current_company_id()
  );

drop policy if exists actions_delete_qhse on public.actions_correctives;
create policy actions_delete_multi_company
  on public.actions_correctives for delete
  using (
    company_id = public.current_company_id()
    and public.has_permission('actions.manage')
  );

-- 5. Audits & Findings -------------------------------------------------------
drop policy if exists audits_all_qhse on public.audits;
create policy audits_all_multi_company
  on public.audits for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('audits.manage')
  )
  with check (
    company_id = public.current_company_id()
    and public.has_permission('audits.manage')
  );

drop policy if exists audit_findings_all_qhse on public.audit_findings;
create policy audit_findings_all_multi_company
  on public.audit_findings for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('audits.manage')
  )
  with check (
    company_id = public.current_company_id()
    and public.has_permission('audits.manage')
  );

-- 6. Risques ------------------------------------------------------------------
drop policy if exists risks_all_qhse on public.risks;
create policy risks_all_multi_company
  on public.risks for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('risks.manage')
  )
  with check (
    company_id = public.current_company_id()
    and public.has_permission('risks.manage')
  );

-- 7. Objectifs ----------------------------------------------------------------
drop policy if exists objectives_select_active on public.qhse_objectives;
create policy objectives_select_multi_company
  on public.qhse_objectives for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists objectives_write_qhse on public.qhse_objectives;
create policy objectives_write_multi_company
  on public.qhse_objectives for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('objectives.manage')
  )
  with check (
    company_id = public.current_company_id()
    and public.has_permission('objectives.manage')
  );

-- 8. Parties intéressées & Conformité ----------------------------------------
drop policy if exists interested_parties_all_qhse on public.interested_parties;
create policy interested_parties_all_multi_company
  on public.interested_parties for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('compliance.manage')
  )
  with check (
    company_id = public.current_company_id()
    and public.has_permission('compliance.manage')
  );

drop policy if exists compliance_obligations_all_qhse on public.compliance_obligations;
create policy compliance_obligations_all_multi_company
  on public.compliance_obligations for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('compliance.manage')
  )
  with check (
    company_id = public.current_company_id()
    and public.has_permission('compliance.manage')
  );

-- 9. Revues de direction ------------------------------------------------------
drop policy if exists management_reviews_all_qhse on public.management_reviews;
create policy management_reviews_all_multi_company
  on public.management_reviews for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('reviews.manage')
  )
  with check (
    company_id = public.current_company_id()
    and public.has_permission('reviews.manage')
  );

-- 10. Documents ---------------------------------------------------------------
drop policy if exists documents_select_active on public.documents;
create policy documents_select_multi_company
  on public.documents for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists documents_write_qhse on public.documents;
create policy documents_write_multi_company
  on public.documents for insert
  with check (
    company_id = public.current_company_id()
    and public.has_permission('documents.manage')
    and uploaded_by = auth.uid()
  );

drop policy if exists documents_delete_qhse on public.documents;
create policy documents_delete_multi_company
  on public.documents for delete
  using (
    company_id = public.current_company_id()
    and public.has_permission('documents.manage')
  );

-- 11. Équipements -------------------------------------------------------------
drop policy if exists equipment_select_active on public.equipment;
create policy equipment_select_multi_company
  on public.equipment for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists equipment_all_qhse on public.equipment;
create policy equipment_all_multi_company
  on public.equipment for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('equipment.manage')
  )
  with check (
    company_id = public.current_company_id()
    and public.has_permission('equipment.manage')
  );

-- 12. Politique QHSE ----------------------------------------------------------
drop policy if exists qhse_policies_select_active on public.qhse_policies;
create policy qhse_policies_select_multi_company
  on public.qhse_policies for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists qhse_policies_insert_qhse on public.qhse_policies;
create policy qhse_policies_insert_multi_company
  on public.qhse_policies for insert
  with check (
    company_id = public.current_company_id()
    and public.has_permission('policy.publish')
    and created_by = auth.uid()
  );

-- 13. Règlement intérieur -----------------------------------------------------
drop policy if exists internal_regulations_select on public.internal_regulations;
drop policy if exists regulations_select_active on public.internal_regulations;
create policy internal_regulations_select_multi_company
  on public.internal_regulations for select
  using (
    company_id = public.current_company_id()
    and public.is_active_user()
  );

drop policy if exists regulations_write_admin on public.internal_regulations;
create policy internal_regulations_write_multi_company
  on public.internal_regulations for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('settings.manage')
  )
  with check (
    company_id = public.current_company_id()
    and public.has_permission('settings.manage')
  );

-- 14. Notifications -----------------------------------------------------------
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_multi_company
  on public.notifications for select
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_multi_company
  on public.notifications for update
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  )
  with check (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

-- 15. Messagerie --------------------------------------------------------------
drop policy if exists conversations_select on public.conversations;
drop policy if exists conversations_select_member on public.conversations;
create policy conversations_select_multi_company
  on public.conversations for select
  using (
    company_id = public.current_company_id()
    and public.is_conv_participant(id)
  );

drop policy if exists conversations_insert on public.conversations;
drop policy if exists conversations_insert_member on public.conversations;
create policy conversations_insert_multi_company
  on public.conversations for insert
  with check (
    company_id = public.current_company_id()
    and created_by = auth.uid()
  );

drop policy if exists messages_select on public.messages;
drop policy if exists messages_select_member on public.messages;
create policy messages_select_multi_company
  on public.messages for select
  using (
    company_id = public.current_company_id()
    and public.is_conv_participant(conversation_id)
  );

drop policy if exists messages_insert on public.messages;
drop policy if exists messages_insert_sender on public.messages;
create policy messages_insert_multi_company
  on public.messages for insert
  with check (
    company_id = public.current_company_id()
    and sender_id = auth.uid()
    and public.is_conv_participant(conversation_id)
  );
