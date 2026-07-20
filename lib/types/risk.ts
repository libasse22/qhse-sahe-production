export type RiskCategory = "qualite" | "securite" | "environnement" | "autre";
export type RiskStatus = "identifie" | "en_traitement" | "maitrise" | "cloture";

export interface Risk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  probability: number;
  gravity: number;
  criticality: number;
  treatment: string;
  ownerId: string | null;
  ownerName: string | null;
  status: RiskStatus;
  createdAt: string;
}

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  qualite: "Qualité",
  securite: "Sécurité",
  environnement: "Environnement",
  autre: "Autre",
};

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  identifie: "Identifié",
  en_traitement: "En traitement",
  maitrise: "Maîtrisé",
  cloture: "Clôturé",
};

export const RISK_STATUS_BADGE: Record<RiskStatus, "outline" | "warning" | "success" | "secondary"> = {
  identifie: "outline",
  en_traitement: "warning",
  maitrise: "success",
  cloture: "secondary",
};

export const RISK_CATEGORY_ORDER: RiskCategory[] = ["qualite", "securite", "environnement", "autre"];
export const RISK_STATUS_ORDER: RiskStatus[] = ["identifie", "en_traitement", "maitrise", "cloture"];

/** Niveau de criticité (1-25) : couleur pour la matrice ISO 31000. */
export function criticalityColor(score: number): string {
  if (score >= 15) return "bg-red-500 text-white";
  if (score >= 8) return "bg-orange-400 text-white";
  if (score >= 4) return "bg-amber-300 text-amber-900";
  return "bg-emerald-300 text-emerald-900";
}
