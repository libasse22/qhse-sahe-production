export type ActionStatus =
  | "brouillon"
  | "ouverte"
  | "en_cours"
  | "bloquee"
  | "a_verifier"
  | "cloturee"
  | "rejetee"
  | "reouverte"
  // Retro-compatibilité avec anciennes valeurs DB
  | "a_faire"
  | "termine";

export type CapaActionType = "corrective" | "preventive" | "amelioration";
export type QhseDomain = "qualite" | "securite" | "environnement" | "hygiene";
export type ActionPriority = "faible" | "moyenne" | "elevee" | "critique";
export type CapaEfficiencyStatus = "non_evalue" | "efficace" | "partiellement_efficace" | "inefficace";
export type ActionBlockCategory =
  | "ressources"
  | "budget"
  | "fournisseur"
  | "dependance"
  | "validation_management"
  | "technique"
  | "autre";

export interface ActionComment {
  id: string;
  companyId: string;
  actionId: string;
  authorId: string;
  authorName: string;
  comment: string;
  createdAt: string;
}

export interface ActionHistoryEvent {
  id: string;
  companyId: string;
  actionId: string;
  actorId: string;
  actorName: string;
  eventType: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  comment: string | null;
  createdAt: string;
}

export interface ActionCorrective {
  id: string;
  codeReference: string;
  typeAction: CapaActionType;
  domaineQhse: QhseDomain;
  priorite: ActionPriority;
  incidentId?: string | null;
  incidentTitle?: string | null;
  auditId?: string | null;
  auditTitle?: string | null;
  riskId?: string | null;
  riskTitle?: string | null;
  inspectionRunId?: string | null;
  inspectionItemId?: string | null;
  workPermitId?: string | null;
  workPermitTitle?: string | null;
  parentActionId?: string | null;
  sourceType: "incident" | "inspection" | "audit" | "risk" | "permis" | "autre";
  sourceTitle: string;
  description: string;
  responsableId: string;
  responsableName: string;
  echeance: string;
  echeanceInitiale: string;
  extensionCount: number;
  status: ActionStatus;

  // Blocage
  isBlocked: boolean;
  blockedAt?: string | null;
  blockedReasonCategory?: ActionBlockCategory | null;
  blockedReasonDetail?: string | null;
  blockedByName?: string | null;
  unblockedAt?: string | null;

  // Analyse des causes
  causeImmediate?: string | null;
  causeRacine?: string | null;
  methodeAnalyse?: string | null;
  analyse5Pourquoi?: string[] | null;

  // Efficacité et Clôture
  efficaciteStatut: CapaEfficiencyStatus;
  dateVerification?: string | null;
  verificateurId?: string | null;
  verificateurName?: string | null;
  commentaireEfficacite?: string | null;
  motifRejet?: string | null;
  clotureAt?: string | null;
  clotureParName?: string | null;

  createdAt: string;
  updatedAt: string;

  // Jointures
  commentsCount?: number;
  proofsCount?: number;
}

export const CAPA_ACTION_TYPE_LABELS: Record<CapaActionType, string> = {
  corrective: "Action Corrective",
  preventive: "Action Préventive",
  amelioration: "Opportunité d'Amélioration",
};

export const QHSE_DOMAIN_LABELS: Record<QhseDomain, string> = {
  securite: "Sécurité (SST)",
  qualite: "Qualité (SMQ)",
  environnement: "Environnement (SME)",
  hygiene: "Hygiène (HSE)",
};

export const ACTION_PRIORITY_LABELS: Record<ActionPriority, string> = {
  faible: "Faible",
  moyenne: "Moyenne",
  elevee: "Élevée",
  critique: "Critique",
};

export const ACTION_PRIORITY_BADGE_VARIANT: Record<
  ActionPriority,
  "outline" | "secondary" | "warning" | "destructive"
> = {
  faible: "outline",
  moyenne: "secondary",
  elevee: "warning",
  critique: "destructive",
};

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  brouillon: "Brouillon",
  ouverte: "Ouverte",
  en_cours: "En cours",
  bloquee: "Bloquée",
  a_verifier: "À vérifier",
  cloturee: "Clôturée",
  rejetee: "Rejetée",
  reouverte: "Réouverte",
  a_faire: "Ouverte (Ancien)",
  termine: "Clôturée (Ancien)",
};

export const ACTION_STATUS_BADGE_VARIANT: Record<
  ActionStatus,
  "outline" | "default" | "secondary" | "warning" | "success" | "destructive"
> = {
  brouillon: "outline",
  ouverte: "secondary",
  en_cours: "default",
  bloquee: "destructive",
  a_verifier: "warning",
  cloturee: "success",
  rejetee: "destructive",
  reouverte: "warning",
  a_faire: "secondary",
  termine: "success",
};

export const CAPA_EFFICIENCY_LABELS: Record<CapaEfficiencyStatus, string> = {
  non_evalue: "Non évaluée",
  efficace: "Efficace",
  partiellement_efficace: "Partiellement Efficace",
  inefficace: "Inefficace",
};

export const ACTION_STATUS_ORDER: ActionStatus[] = [
  "brouillon",
  "ouverte",
  "en_cours",
  "bloquee",
  "a_verifier",
  "cloturee",
  "rejetee",
  "reouverte",
];

/** Une action est en retard si son échéance est dépassée et qu'elle n'est ni clôturée ni rejetée. */
export function isActionEnRetard(action: Pick<ActionCorrective, "echeance" | "status">): boolean {
  if (action.status === "cloturee" || action.status === "rejetee" || action.status === "termine") {
    return false;
  }
  return new Date(action.echeance) < new Date(new Date().toDateString());
}
