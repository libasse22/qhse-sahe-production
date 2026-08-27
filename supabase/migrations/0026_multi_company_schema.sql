-- ============================================================================
-- Migration 0026 : Architecture Multi-Entreprise (Schéma & Auto-Population)
-- QHSE Duo Sénégal
-- ============================================================================

-- 1. Fonction helper SECURITY DEFINER pour récupérer la company_id courante ----
create or replace function public.current_company_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select company_id from public.profiles
  where id = auth.uid();
$$;

-- 2. Création de l'entreprise par défaut pour la migration des données --------
insert into public.companies (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Entreprise Principale')
on conflict (id) do nothing;

-- Rattachement des profils et sites existants s'ils sont orphelins
update public.profiles
set company_id = '11111111-1111-1111-1111-111111111111'
where company_id is null;

update public.sites
set company_id = '11111111-1111-1111-1111-111111111111'
where company_id is null;

-- 3. Ajout de company_id et indexation sur toutes les tables métier -----------

-- Incidents
alter table public.incidents add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.incidents set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists incidents_company_id_idx on public.incidents(company_id);

-- Actions correctives
alter table public.actions_correctives add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.actions_correctives set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists actions_correctives_company_id_idx on public.actions_correctives(company_id);

-- Photos d'incidents
alter table public.incident_photos add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.incident_photos set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists incident_photos_company_id_idx on public.incident_photos(company_id);

-- Messages vocaux d'incidents
alter table public.incident_voice_notes add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.incident_voice_notes set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists incident_voice_notes_company_id_idx on public.incident_voice_notes(company_id);

-- Politique QHSE
alter table public.qhse_policies add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.qhse_policies set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists qhse_policies_company_id_idx on public.qhse_policies(company_id);

-- Audits
alter table public.audits add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.audits set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists audits_company_id_idx on public.audits(company_id);

-- Constats d'audits
alter table public.audit_findings add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.audit_findings set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists audit_findings_company_id_idx on public.audit_findings(company_id);

-- Registre des risques
alter table public.risks add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.risks set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists risks_company_id_idx on public.risks(company_id);

-- Objectifs QHSE
alter table public.qhse_objectives add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.qhse_objectives set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists qhse_objectives_company_id_idx on public.qhse_objectives(company_id);

-- Parties intéressées
alter table public.interested_parties add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.interested_parties set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists interested_parties_company_id_idx on public.interested_parties(company_id);

-- Obligations de conformité
alter table public.compliance_obligations add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.compliance_obligations set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists compliance_obligations_company_id_idx on public.compliance_obligations(company_id);

-- Revues de direction
alter table public.management_reviews add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.management_reviews set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists management_reviews_company_id_idx on public.management_reviews(company_id);

-- Documents
alter table public.documents add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.documents set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists documents_company_id_idx on public.documents(company_id);

-- Équipements
alter table public.equipment add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.equipment set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists equipment_company_id_idx on public.equipment(company_id);

-- Notifications
alter table public.notifications add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.notifications set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists notifications_company_id_idx on public.notifications(company_id);

-- Conversations
alter table public.conversations add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.conversations set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists conversations_company_id_idx on public.conversations(company_id);

-- Messages
alter table public.messages add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.messages set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists messages_company_id_idx on public.messages(company_id);

-- Règlement intérieur
alter table public.internal_regulations add column if not exists company_id uuid references public.companies(id) on delete cascade;
update public.internal_regulations set company_id = '11111111-1111-1111-1111-111111111111' where company_id is null;
create index if not exists internal_regulations_company_id_idx on public.internal_regulations(company_id);

-- 4. Trigger d'auto-population set_company_id() -------------------------------

create or replace function public.set_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null then
    new.company_id := public.current_company_id();
  end if;
  return new;
end;
$$;

-- Triggers d'auto-assignation
drop trigger if exists trg_set_company_id_incidents on public.incidents;
create trigger trg_set_company_id_incidents
  before insert on public.incidents
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_actions on public.actions_correctives;
create trigger trg_set_company_id_actions
  before insert on public.actions_correctives
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_incident_photos on public.incident_photos;
create trigger trg_set_company_id_incident_photos
  before insert on public.incident_photos
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_incident_voice_notes on public.incident_voice_notes;
create trigger trg_set_company_id_incident_voice_notes
  before insert on public.incident_voice_notes
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_qhse_policies on public.qhse_policies;
create trigger trg_set_company_id_qhse_policies
  before insert on public.qhse_policies
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_audits on public.audits;
create trigger trg_set_company_id_audits
  before insert on public.audits
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_audit_findings on public.audit_findings;
create trigger trg_set_company_id_audit_findings
  before insert on public.audit_findings
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_risks on public.risks;
create trigger trg_set_company_id_risks
  before insert on public.risks
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_qhse_objectives on public.qhse_objectives;
create trigger trg_set_company_id_qhse_objectives
  before insert on public.qhse_objectives
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_interested_parties on public.interested_parties;
create trigger trg_set_company_id_interested_parties
  before insert on public.interested_parties
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_compliance_obligations on public.compliance_obligations;
create trigger trg_set_company_id_compliance_obligations
  before insert on public.compliance_obligations
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_management_reviews on public.management_reviews;
create trigger trg_set_company_id_management_reviews
  before insert on public.management_reviews
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_documents on public.documents;
create trigger trg_set_company_id_documents
  before insert on public.documents
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_equipment on public.equipment;
create trigger trg_set_company_id_equipment
  before insert on public.equipment
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_notifications on public.notifications;
create trigger trg_set_company_id_notifications
  before insert on public.notifications
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_conversations on public.conversations;
create trigger trg_set_company_id_conversations
  before insert on public.conversations
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_messages on public.messages;
create trigger trg_set_company_id_messages
  before insert on public.messages
  for each row execute function public.set_company_id();

drop trigger if exists trg_set_company_id_internal_regulations on public.internal_regulations;
create trigger trg_set_company_id_internal_regulations
  before insert on public.internal_regulations
  for each row execute function public.set_company_id();
