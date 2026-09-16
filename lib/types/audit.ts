export type AuditStatus = "brouillon" | "en_preparation" | "en_cours" | "cloture" | "archive" | "planifie" | "termine";
export type FindingType = "conformite" | "non_conformite_mineure" | "non_conformite_majeure" | "point_sensible";

export type AuditItemStatus = "conforme" | "non_conforme" | "observation" | "non_applicable" | "non_evalue";

export type AuditProofType = 
  | "ged_document"
  | "incident"
  | "inspection"
  | "capa_action"
  | "work_permit"
  | "epi_assignment"
  | "situation_proof"
  | "qhse_report";

export interface AuditItem {
  id: string;
  companyId?: string;
  auditId: string;
  title: string;
  requirement: string;
  category: string;
  status: AuditItemStatus;
  comment: string;
  capaActionId?: string | null;
  createdAt: string;
  updatedAt: string;
  proofLinks?: AuditProofLink[];
}

export interface AuditProofLink {
  id: string;
  companyId?: string;
  auditId: string;
  auditItemId?: string | null;
  proofType: AuditProofType;
  targetId: string;
  title: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditHistoryEvent {
  id: string;
  companyId?: string;
  auditId: string;
  actorId: string;
  actorName: string;
  eventType: 
    | "audit_created" 
    | "status_updated" 
    | "item_added" 
    | "item_status_updated" 
    | "proof_linked" 
    | "proof_unlinked" 
    | "capa_created" 
    | "audit_closed";
  comment?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface Audit {
  id: string;
  title: string;
  scope: string;
  criteria: string;
  auditorId: string;
  auditorName: string;
  plannedDate: string;
  startDate?: string | null;
  endDate?: string | null;
  siteId?: string | null;
  siteName?: string | null;
  referenceFramework?: string | null;
  status: AuditStatus;
  companyId?: string;
  createdAt: string;
}

export interface AuditFinding {
  id: string;
  auditId: string;
  type: FindingType;
  description: string;
  actionId: string | null;
  createdAt: string;
}

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  brouillon: "Brouillon",
  en_preparation: "En préparation",
  en_cours: "En cours",
  cloture: "Clôturé",
  archive: "Archivé",
  planifie: "Planifié",
  termine: "Terminé",
};

export const AUDIT_STATUS_BADGE: Record<AuditStatus, "outline" | "warning" | "success" | "secondary" | "destructive"> = {
  brouillon: "outline",
  en_preparation: "secondary",
  en_cours: "warning",
  cloture: "success",
  archive: "secondary",
  planifie: "outline",
  termine: "success",
};

export const AUDIT_ITEM_STATUS_LABELS: Record<AuditItemStatus, string> = {
  conforme: "Conforme",
  non_conforme: "Non conforme",
  observation: "Observation",
  non_applicable: "N/A",
  non_evalue: "Non évalué",
};

export const AUDIT_ITEM_STATUS_BADGE: Record<AuditItemStatus, "success" | "destructive" | "warning" | "secondary" | "outline"> = {
  conforme: "success",
  non_conforme: "destructive",
  observation: "warning",
  non_applicable: "secondary",
  non_evalue: "outline",
};

export const AUDIT_PROOF_TYPE_LABELS: Record<AuditProofType, string> = {
  ged_document: "Document GED",
  incident: "Incident",
  inspection: "Inspection",
  capa_action: "Action CAPA",
  work_permit: "Permis de travail (PtW)",
  epi_assignment: "Attribution EPI",
  situation_proof: "Preuve de situation / Terrain",
  qhse_report: "Rapport QHSE",
};

export const FINDING_TYPE_LABELS: Record<FindingType, string> = {
  conformite: "Conformité",
  non_conformite_mineure: "Non-conformité mineure",
  non_conformite_majeure: "Non-conformité majeure",
  point_sensible: "Point sensible",
};

export const FINDING_TYPE_BADGE: Record<FindingType, "success" | "warning" | "destructive" | "secondary"> = {
  conformite: "success",
  non_conformite_mineure: "warning",
  non_conformite_majeure: "destructive",
  point_sensible: "secondary",
};

export const AUDIT_STATUS_ORDER: AuditStatus[] = ["brouillon", "en_preparation", "en_cours", "cloture", "archive"];
export const FINDING_TYPE_ORDER: FindingType[] = [
  "conformite",
  "non_conformite_mineure",
  "non_conformite_majeure",
  "point_sensible",
];

