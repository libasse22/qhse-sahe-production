export type WorkPermitType =
  | "hauteur"
  | "point_chaud"
  | "espace_confine"
  | "electrique"
  | "fouille"
  | "chimique"
  | "autre";

export type WorkPermitStatus =
  | "brouillon"
  | "en_attente"
  | "approuve"
  | "refuse"
  | "en_cours"
  | "cloture"
  | "annule";

export interface SafetyMeasure {
  id: string;
  label: string;
  checked: boolean;
}

export interface WorkPermit {
  id: string;
  reference: string;
  permitType: WorkPermitType;
  title: string;
  description: string;
  location: string;
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
  status: WorkPermitStatus;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const PERMIT_TYPE_LABELS: Record<WorkPermitType, string> = {
  hauteur: "Travaux en Hauteur",
  point_chaud: "Point Chaud (Soudure/Meulage)",
  espace_confine: "Espace Confiné",
  electrique: "Consignation Électrique",
  fouille: "Fouille / Tranchée",
  chimique: "Produits Chimiques / Risque Toxique",
  autre: "Autre Travall à Risque",
};

export const PERMIT_STATUS_LABELS: Record<WorkPermitStatus, string> = {
  brouillon: "Brouillon",
  en_attente: "En attente de validation",
  approuve: "Approuvé",
  refuse: "Refusé",
  en_cours: "En cours d'exécution",
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
  cloture: "outline",
  annule: "destructive",
};
