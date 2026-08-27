-- ============================================================================
-- Migration 0028 : Correction des clauses WITH CHECK pour les insertions RLS
-- QHSE Duo Sénégal
-- ============================================================================
-- Lors d'une insertion, le client ne transmet pas explicitement `company_id`
-- car il est alimenté automatiquement par le trigger BEFORE INSERT `set_company_id()`.
-- La vérification RLS `WITH CHECK (company_id = current_company_id())` échouait
-- car `new.company_id` était encore NULL lors de l'évaluation initiale.
--
-- Cette migration ajuste la condition WITH CHECK pour accepter `company_id IS NULL`
-- (qui sera immédiatement complété par le trigger) ou égal à l'entreprise courante.

-- 1. Incidents
drop policy if exists incidents_insert_multi_company on public.incidents;
create policy incidents_insert_multi_company
  on public.incidents for insert
  with check (
    (company_id is null or company_id = public.current_company_id())
    and reported_by = auth.uid()
  );

-- 2. Actions correctives
drop policy if exists actions_insert_multi_company on public.actions_correctives;
create policy actions_insert_multi_company
  on public.actions_correctives for insert
  with check (
    (company_id is null or company_id = public.current_company_id())
    and public.has_permission('actions.manage')
  );

-- 3. Photos d'incidents
drop policy if exists incident_photos_insert_multi_company on public.incident_photos;
create policy incident_photos_insert_multi_company
  on public.incident_photos for insert
  with check (
    company_id is null or company_id = public.current_company_id()
  );

-- 4. Messages vocaux d'incidents
drop policy if exists incident_voice_notes_insert_multi_company on public.incident_voice_notes;
create policy incident_voice_notes_insert_multi_company
  on public.incident_voice_notes for insert
  with check (
    company_id is null or company_id = public.current_company_id()
  );

-- 5. Audits & Constats
drop policy if exists audits_all_multi_company on public.audits;
create policy audits_all_multi_company
  on public.audits for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('audits.manage')
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
    and public.has_permission('audits.manage')
  );

drop policy if exists audit_findings_all_multi_company on public.audit_findings;
create policy audit_findings_all_multi_company
  on public.audit_findings for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('audits.manage')
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
    and public.has_permission('audits.manage')
  );

-- 6. Risques
drop policy if exists risks_all_multi_company on public.risks;
create policy risks_all_multi_company
  on public.risks for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('risks.manage')
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
    and public.has_permission('risks.manage')
  );

-- 7. Objectifs
drop policy if exists objectives_write_multi_company on public.qhse_objectives;
create policy objectives_write_multi_company
  on public.qhse_objectives for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('objectives.manage')
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
    and public.has_permission('objectives.manage')
  );

-- 8. Parties intéressées & Conformité
drop policy if exists interested_parties_all_multi_company on public.interested_parties;
create policy interested_parties_all_multi_company
  on public.interested_parties for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('compliance.manage')
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
    and public.has_permission('compliance.manage')
  );

drop policy if exists compliance_obligations_all_multi_company on public.compliance_obligations;
create policy compliance_obligations_all_multi_company
  on public.compliance_obligations for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('compliance.manage')
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
    and public.has_permission('compliance.manage')
  );

-- 9. Revues de direction
drop policy if exists management_reviews_all_multi_company on public.management_reviews;
create policy management_reviews_all_multi_company
  on public.management_reviews for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('reviews.manage')
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
    and public.has_permission('reviews.manage')
  );

-- 10. Documents
drop policy if exists documents_write_multi_company on public.documents;
create policy documents_write_multi_company
  on public.documents for insert
  with check (
    (company_id is null or company_id = public.current_company_id())
    and public.has_permission('documents.manage')
    and uploaded_by = auth.uid()
  );

-- 11. Équipements
drop policy if exists equipment_all_multi_company on public.equipment;
create policy equipment_all_multi_company
  on public.equipment for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('equipment.manage')
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
    and public.has_permission('equipment.manage')
  );

-- 12. Politique QHSE
drop policy if exists qhse_policies_insert_multi_company on public.qhse_policies;
create policy qhse_policies_insert_multi_company
  on public.qhse_policies for insert
  with check (
    (company_id is null or company_id = public.current_company_id())
    and public.has_permission('policy.publish')
    and created_by = auth.uid()
  );

-- 13. Règlement intérieur
drop policy if exists internal_regulations_write_multi_company on public.internal_regulations;
create policy internal_regulations_write_multi_company
  on public.internal_regulations for all
  using (
    company_id = public.current_company_id()
    and public.has_permission('settings.manage')
  )
  with check (
    (company_id is null or company_id = public.current_company_id())
    and public.has_permission('settings.manage')
  );

-- 14. Messagerie
drop policy if exists conversations_insert_multi_company on public.conversations;
create policy conversations_insert_multi_company
  on public.conversations for insert
  with check (
    (company_id is null or company_id = public.current_company_id())
    and created_by = auth.uid()
  );

drop policy if exists messages_insert_multi_company on public.messages;
create policy messages_insert_multi_company
  on public.messages for insert
  with check (
    (company_id is null or company_id = public.current_company_id())
    and sender_id = auth.uid()
    and public.is_conv_participant(conversation_id)
  );
