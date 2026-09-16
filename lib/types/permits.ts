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
  responsibility?: "EE" | "EU" | "CONJOINTE";
}

export type WorkPermitSignatureRole = "EXECUTOR" | "PREVENTION" | "WORKPLACE_MANAGER" | "AUTHORIZER";

export interface WorkPermitSignature {
  id: string;
  companyId: string;
  workPermitId: string;
  roleCode: WorkPermitSignatureRole | string;
  signerId?: string | null;
  signerName: string;
  signerRoleLabel?: string | null;
  status: "pending" | "signed" | "refused";
  rejectionReason?: string | null;
  signatureMode: "digital" | "handwritten_upload";
  signatureStoragePath?: string | null;
  signedAt?: string | null;
  signedIp?: string | null;
  stepOrder: number;
  createdAt: string;
}

export interface WorkPermitWorker {
  id: string;
  workPermitId: string;
  workerId?: string | null;
  workerName: string;
  roleOrQualification: string;
  acknowledgementStatus?: "pending" | "acknowledged" | "refused";
  acknowledgedAt?: string | null;
  acknowledgementMethod?: "digital" | "paper";
  rejectionReason?: string | null;
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

export interface CustomColumnConfig {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "yes_no" | "date";
  options?: string[];
  unit?: string;
  required?: boolean;
}

export interface CustomFieldConfig {
  id: string;
  label: string;
  description?: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "yes_no"
    | "yes_no_na"
    | "select"
    | "checkbox"
    | "date"
    | "time"
    | "person"
    | "file"
    | "photo_proof"
    | "table";
  order: number;
  required?: boolean;
  critical?: boolean;
  blockingValue?: string;
  options?: string[];
  unit?: string;
  defaultValue?: string;
  helpText?: string;
  showOnPrint?: boolean;
  columns?: CustomColumnConfig[];
}

export interface CustomSectionConfig {
  id: string;
  title: string;
  description?: string;
  order: number;
  active: boolean;
  showOnPrint: boolean;
  showOnScreen: boolean;
  required?: boolean;
  fields: CustomFieldConfig[];
}

export interface WorkPermitTemplateSnapshot {
  templateName: string;
  versionLabel: string;
  maxValidityHours: number;
  enabledPermitTypes: WorkPermitType[];
  questionnaires: Record<string, QuestionnaireQuestion[]>;
  beforeMeasures: SafetyMeasure[];
  duringMeasures: SafetyMeasure[];
  afterMeasures: SafetyMeasure[];
  epiList: { id: string; label: string }[];
  equipmentList?: string[];
  emergencyPlanConfig?: Record<string, string>;
  signatureChain?: string[];
  customSections?: CustomSectionConfig[];
}

export type WorkPermitTemplateStatus = "brouillon" | "actif" | "archive";

export interface WorkPermitTemplate {
  id: string;
  companyId: string;
  name: string;
  description: string;
  code: string;
  versionMajor: number;
  versionMinor: number;
  status: WorkPermitTemplateStatus;
  isDefault: boolean;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  activeVersion?: WorkPermitTemplateVersion | null;
}

export interface WorkPermitTemplateVersion {
  id: string;
  templateId: string;
  companyId: string;
  versionMajor: number;
  versionMinor: number;
  versionLabel: string;
  status: "actif" | "archive";
  configuration: WorkPermitTemplateSnapshot;
  createdBy?: string | null;
  createdAt: string;
}

export interface WorkPermit {
  id: string;
  reference: string;
  permitType: WorkPermitType;
  title: string;
  description: string;
  location: string;
  contractorCompany?: string | null;
  contractorContactName?: string | null;
  contractorContactPhone?: string | null;
  siteId?: string | null;
  siteName?: string | null;
  equipmentId?: string | null;
  equipmentName?: string | null;
  equipmentIds?: string[] | null;
  equipmentNames?: string[] | null;
  decision?: "AUTORISE" | "NON_AUTORISE" | null;
  applicantId: string;
  applicantName?: string | null;
  approverId?: string | null;
  approverName?: string | null;
  startTime: string;
  endTime: string;
  safetyMeasures: SafetyMeasure[];
  workers?: WorkPermitWorker[];
  signatures?: WorkPermitSignature[];
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
  templateId?: string | null;
  templateVersionId?: string | null;
  templateSnapshot?: WorkPermitTemplateSnapshot | null;
  customFieldsData?: Record<string, any> | null;
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
