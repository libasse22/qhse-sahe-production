export type CopilotResponseType = 'fact' | 'proposal' | 'missing_info' | 'error';

export interface CopilotSource {
  id: string;
  module: 'incident' | 'capa' | 'audit' | 'inspection' | 'work_permit' | 'epi' | 'document' | 'meeting' | 'cockpit' | string;
  title: string;
  reference?: string | null;
  href: string;
  badgeText?: string;
  badgeVariant?: 'destructive' | 'warning' | 'success' | 'secondary' | 'outline';
}

export interface CopilotResponse {
  query: string;
  responseType: CopilotResponseType;
  markdownContent: string;
  sources: CopilotSource[];
  suggestedActions?: {
    label: string;
    actionType: 'open_href' | 'add_to_agenda' | 'prepare_pv' | 'propose_action' | 'ask_followup';
    targetHref?: string;
    payload?: Record<string, unknown>;
  }[];
  timestamp: string;
  isConfigured: boolean;
}

export interface CopilotAuditLog {
  id: string;
  companyId?: string | null;
  userId?: string | null;
  userName?: string | null;
  queryText: string;
  operationType: string;
  sourcesUsed: CopilotSource[];
  createdAt: string;
}
