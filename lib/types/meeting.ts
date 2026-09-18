export type MeetingType =
  | 'qhse'
  | 'hse'
  | 'securite'
  | 'revue_direction'
  | 'toolbox'
  | 'causerie'
  | 'inspection'
  | 'autre';

export type MeetingStatus =
  | 'planifiee'
  | 'en_cours'
  | 'pv_a_valider'
  | 'validee'
  | 'signee'
  | 'archivee'
  | 'annulee';

export type AttendanceStatus = 'present' | 'absent' | 'excuse' | 'representant';

export type AgendaSourceType =
  | 'cockpit'
  | 'incident'
  | 'inspection'
  | 'audit'
  | 'capa'
  | 'work_permit'
  | 'epi'
  | 'document'
  | 'previous_meeting'
  | 'manual';

export interface Meeting {
  id: string;
  companyId?: string | null;
  reference: string;
  title: string;
  meetingType: MeetingType;
  status: MeetingStatus;
  scheduledAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  location?: string | null;
  organizerUserId?: string | null;
  organizerName?: string | null;
  secretaryUserId?: string | null;
  secretaryName?: string | null;
  description?: string | null;
  agenda?: string | null;
  notes?: string | null;
  documentId?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId?: string | null;
  fullName: string;
  role?: string | null;
  organization?: string | null;
  attendanceStatus: AttendanceStatus;
  signatureRequired: boolean;
  createdAt: string;
}

export interface MeetingAgendaItem {
  id: string;
  meetingId: string;
  position: number;
  title: string;
  description?: string | null;
  sourceType?: AgendaSourceType | null;
  sourceId?: string | null;
  status: string;
  createdAt: string;
  sourceTitle?: string | null;
  sourceHref?: string | null;
}

export interface MeetingDecision {
  id: string;
  meetingId: string;
  agendaItemId?: string | null;
  decisionText: string;
  decisionType: string;
  responsibleUserId?: string | null;
  responsibleName?: string | null;
  deadline?: string | null;
  status: string;
  createdAt: string;
}

export interface MeetingActionItem {
  id: string;
  meetingId: string;
  decisionId?: string | null;
  title: string;
  description?: string | null;
  responsibleUserId?: string | null;
  responsibleName?: string | null;
  dueDate?: string | null;
  priority: 'faible' | 'moyenne' | 'elevee' | 'critique';
  status: 'a_faire' | 'en_cours' | 'bloquee' | 'cloturee' | string;
  actionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingHistoryEvent {
  id: string;
  companyId?: string | null;
  meetingId: string;
  eventType:
    | 'meeting_created'
    | 'meeting_updated'
    | 'participant_added'
    | 'agenda_item_added'
    | 'decision_created'
    | 'action_proposed'
    | 'action_confirmed'
    | 'pv_generated'
    | 'pv_validated'
    | 'pv_signed'
    | 'meeting_archived'
    | string;
  actorId?: string | null;
  actorName: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface MeetingDetails {
  meeting: Meeting;
  participants: MeetingParticipant[];
  agendaItems: MeetingAgendaItem[];
  decisions: MeetingDecision[];
  actionItems: MeetingActionItem[];
  history: MeetingHistoryEvent[];
  documentUrl?: string | null;
}

export interface MeetingSuggestion {
  sourceType: AgendaSourceType;
  sourceId: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  responsibleName?: string | null;
  badgeText: string;
  badgeVariant: 'destructive' | 'warning' | 'secondary' | 'outline' | 'success';
  href: string;
}

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  qhse: 'Réunion QHSE',
  hse: 'Comité HSE / CSSCT',
  securite: 'Réunion Sécurité Site',
  revue_direction: 'Revue de Direction ISO',
  toolbox: 'Toolbox Talk',
  causerie: 'Causerie Sécurité / Flash HSE',
  inspection: 'Restitution d\'Inspection',
  autre: 'Autre Réunion',
};

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  planifiee: 'Planifiée',
  en_cours: 'En cours',
  pv_a_valider: 'PV à valider',
  validee: 'PV validé',
  signee: 'PV signé',
  archivee: 'Archivée',
  annulee: 'Annulée',
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Présent',
  absent: 'Absent non excusé',
  excuse: 'Excusé',
  representant: 'Représenté',
};
