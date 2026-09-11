export type WorkPermitType =
  | "hauteur"
  | "point_chaud"
  | "espace_confine"
  | "electrique"
  | "fouille"
  | "excavation"
  | "chimique"
  | "levage"
  | "consignation_loto"
  | "toiture"
  | "tuyauterie"
  | "maconnerie"
  | "autre";

export type WorkPermitStatus =
  | "brouillon"
  | "en_attente"
  | "approuve"
  | "refuse"
  | "en_cours"
  | "suspendu"
  | "cloture"
  | "annule";

export interface SafetyMeasure {
  id: string;
  label: string;
  checked: boolean;
  critical?: boolean;
  status?: "conforme" | "non_conforme" | "a_verifier";
}

export interface WorkPermitWorker {
  id: string;
  workPermitId: string;
  workerId?: string | null;
  workerName: string;
  roleOrQualification: string;
  createdAt?: string;
}

export interface WorkPermitHistoryEvent {
  id: string;
  companyId: string;
  permitId: string;
  actorId: string;
  actorName: string;
  eventType: string;
  oldStatus?: WorkPermitStatus | null;
  newStatus?: WorkPermitStatus | null;
  details?: Record<string, unknown> | null;
  comment?: string | null;
  createdAt: string;
}

export interface QuestionnaireQuestion {
  id: string;
  label: string;
  type: "yes_no" | "compliance" | "select" | "number" | "text";
  options?: string[];
  unit?: string;
  critical?: boolean;
  blockingValue?: string; // Value that triggers a blocking alert if matched
}

export interface WorkPermit {
  id: string;
  reference: string;
  permitType: WorkPermitType;
  title: string;
  description: string;
  location: string;
  contractorCompany?: string | null;
  siteId?: string | null;
  siteName?: string | null;
  equipmentId?: string | null;
  equipmentName?: string | null;
  applicantId: string;
  applicantName?: string | null;
  approverId?: string | null;
  approverName?: string | null;
  startTime: string;
  endTime: string;
  safetyMeasures: SafetyMeasure[];
  workers?: WorkPermitWorker[];
  status: WorkPermitStatus;
  rejectionReason?: string | null;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
  questionnaireAnswers?: Record<string, any>;
  beforeMeasures?: SafetyMeasure[];
  duringMeasures?: SafetyMeasure[];
  afterMeasures?: SafetyMeasure[];
  epiRequirements?: string[] | Record<string, boolean>;
  emergencyPlan?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export const PERMIT_TYPE_LABELS: Record<WorkPermitType, string> = {
  hauteur: "1. Travaux en Hauteur",
  point_chaud: "2. Travail à Chaud / Point Chaud",
  espace_confine: "3. Espace Confiné",
  electrique: "4. Travail Électrique / LOTO",
  fouille: "5. Excavation / Terrassement",
  excavation: "5. Excavation / Terrassement",
  chimique: "Produits Chimiques / Toxiques",
  levage: "6. Opérations de Levage",
  consignation_loto: "4. Consignation / LOTO",
  toiture: "7. Travail en Toiture",
  tuyauterie: "8. Travail sur Tuyauterie",
  maconnerie: "9. Travail de Maçonnerie",
  autre: "10. Autre Travail Spécifique",
};

export const PERMIT_STATUS_LABELS: Record<WorkPermitStatus, string> = {
  brouillon: "Brouillon",
  en_attente: "En attente de validation",
  approuve: "Approuvé",
  refuse: "Refusé",
  en_cours: "En cours d'exécution",
  suspendu: "Suspendu (Pause d'urgence)",
  cloture: "Clôturé",
  annule: "Annulé",
};

export const PERMIT_STATUS_BADGE_VARIANT: Record<
  WorkPermitStatus,
  "outline" | "warning" | "success" | "destructive" | "secondary"
> = {
  brouillon: "outline",
  en_attente: "warning",
  approuve: "success",
  refuse: "destructive",
  en_cours: "secondary",
  suspendu: "destructive",
  cloture: "outline",
  annule: "destructive",
};
