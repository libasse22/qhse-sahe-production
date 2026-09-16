export type EpiCategory =
  | "casque"
  | "chaussures"
  | "gants"
  | "lunettes"
  | "gilet"
  | "harnais"
  | "ouie"
  | "respiratoire"
  | "autre";

export type EpiConditionState = "neuf" | "bon" | "use" | "defectueux";

export type EpiAssignmentStatus =
  | "attribue"
  | "en_service"
  | "a_renouveler"
  | "restitue"
  | "perdu_endommage";

export interface EpiCatalogItem {
  id: string;
  companyId?: string | null;
  name: string;
  category: EpiCategory;
  isoNorm: string;
  lifespanMonths: number;
  periodicInspectionDays: number;
  description: string;
  createdAt: string;
}

export interface EpiAssignment {
  id: string;
  companyId?: string | null;
  catalogId: string;
  catalogName?: string;
  category?: EpiCategory;
  isoNorm?: string;
  recipientId: string;
  recipientName?: string;
  assignedById: string;
  assignedByName?: string;
  serialNumber: string;
  quantity: number;
  size: string;
  conditionState: EpiConditionState;
  status: EpiAssignmentStatus;
  assignedAt: string;
  renewalDueAt: string | null;
  returnedAt: string | null;
  renewalReason: string;
  signatureProof: string;
  confirmationCode?: string;
  confirmedAt?: string | null;
  confirmedByUser?: boolean;
  signatureUrl?: string;
  lastInspectedAt?: string | null;
  lastInspectedById?: string | null;
  notes: string;
  createdAt: string;
}

export type EpiHistoryAction =
  | "epi_attributed"
  | "epi_checked"
  | "epi_renewed"
  | "epi_expired"
  | "epi_retired"
  | "epi_acknowledged"
  | "epi_lost_damaged"
  | "epi_modified";

export interface EpiHistoryEvent {
  id: string;
  companyId: string;
  assignmentId: string;
  actorId: string;
  actorName: string;
  recipientId?: string | null;
  recipientName?: string;
  action: EpiHistoryAction;
  comment?: string;
  createdAt: string;
}

export type EpiWorkerItemStatus =
  | "conforme"
  | "a_controler"
  | "manquant"
  | "expire"
  | "non_conforme";

export interface EpiWorkerComplianceItem {
  workerId?: string | null;
  workerName: string;
  requiredEpiId: string;
  requiredEpiLabel: string;
  status: EpiWorkerItemStatus;
  assignmentId?: string | null;
  assignmentStatus?: EpiAssignmentStatus | null;
  conditionState?: EpiConditionState | null;
  renewalDueAt?: string | null;
  message?: string;
}

export interface EpiPermitComplianceResult {
  permitId: string;
  isCompliant: boolean;
  totalRequired: number;
  totalCompliant: number;
  hasEpiRequirements: boolean;
  status: "NA" | "CONFORME" | "NON_CONFORME" | "PENDING_WORKERS";
  summary: string;
  items: EpiWorkerComplianceItem[];
  missingCount: number;
  expiredCount: number;
  defectiveCount: number;
}

export const EPI_CATEGORY_LABELS: Record<EpiCategory, string> = {
  casque: "Casque de protection",
  chaussures: "Chaussures / Bottes de sécurité",
  gants: "Gants de protection",
  lunettes: "Lunettes / Écran facial",
  gilet: "Gilet haute visibilité",
  harnais: "Harnais & Anti-chute",
  ouie: "Protection auditive",
  respiratoire: "Protection respiratoire",
  autre: "Autre équipement individuel",
};

export const EPI_CONDITION_LABELS: Record<EpiConditionState, string> = {
  neuf: "Neuf",
  bon: "Bon état",
  use: "Usé",
  defectueux: "Défectueux / À remplacer",
};

export const EPI_CONDITION_BADGE: Record<EpiConditionState, "success" | "secondary" | "warning" | "destructive"> = {
  neuf: "success",
  bon: "secondary",
  use: "warning",
  defectueux: "destructive",
};

export const EPI_STATUS_LABELS: Record<EpiAssignmentStatus, string> = {
  attribue: "Attribué",
  en_service: "En service",
  a_renouveler: "À renouveler",
  restitue: "Restitué",
  perdu_endommage: "Perdu / Endommagé",
};
