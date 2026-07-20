export type AuditStatus = "planifie" | "en_cours" | "termine";
export type FindingType = "conformite" | "non_conformite_mineure" | "non_conformite_majeure" | "point_sensible";

export interface Audit {
  id: string;
  title: string;
  scope: string;
  criteria: string;
  auditorId: string;
  auditorName: string;
  plannedDate: string;
  status: AuditStatus;
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
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
};

export const AUDIT_STATUS_BADGE: Record<AuditStatus, "outline" | "warning" | "success"> = {
  planifie: "outline",
  en_cours: "warning",
  termine: "success",
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

export const AUDIT_STATUS_ORDER: AuditStatus[] = ["planifie", "en_cours", "termine"];
export const FINDING_TYPE_ORDER: FindingType[] = [
  "conformite",
  "non_conformite_mineure",
  "non_conformite_majeure",
  "point_sensible",
];
