import type { Enums } from "./database.types";

export type IncidentCategory = Enums<"incident_category">;
export type IncidentSeverity = Enums<"incident_severity">;
export type IncidentStatus = Enums<"incident_status">;

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  location: string;
  occurredAt: string;
  reportedBy: string;
  reportedByName: string;
  assignedTo: string | null;
  assignedToName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentPhoto {
  id: string;
  incidentId: string;
  storagePath: string;
  uploadedBy: string;
  createdAt: string;
  url: string | null;
}

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  accident_travail: "Accident du travail",
  presque_accident: "Presque-accident",
  risque_identifie: "Risque identifié",
  non_conformite: "Non-conformité",
  environnement: "Environnement",
  materiel: "Incident matériel",
  autre: "Autre",
};

export const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  faible: "Faible",
  moyenne: "Moyenne",
  elevee: "Élevée",
  critique: "Critique",
};

export const SEVERITY_BADGE_VARIANT: Record<
  IncidentSeverity,
  "secondary" | "warning" | "destructive"
> = {
  faible: "secondary",
  moyenne: "warning",
  elevee: "warning",
  critique: "destructive",
};

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  declare: "Déclaré",
  en_cours: "En cours de traitement",
  resolu: "Résolu",
  cloture: "Clôturé",
};

export const STATUS_BADGE_VARIANT: Record<
  IncidentStatus,
  "outline" | "warning" | "success" | "secondary"
> = {
  declare: "outline",
  en_cours: "warning",
  resolu: "success",
  cloture: "secondary",
};

export const STATUS_ORDER: IncidentStatus[] = ["declare", "en_cours", "resolu", "cloture"];
export const SEVERITY_ORDER: IncidentSeverity[] = ["faible", "moyenne", "elevee", "critique"];
export const CATEGORY_ORDER: IncidentCategory[] = [
  "accident_travail",
  "presque_accident",
  "risque_identifie",
  "non_conformite",
  "environnement",
  "materiel",
  "autre",
];

