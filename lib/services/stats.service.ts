"use server";

import { createClient } from "@/lib/supabase/server";
import type { IncidentCategory, IncidentSeverity, IncidentStatus } from "@/lib/types/incidents";
import type { ActionStatus } from "@/lib/types/actions";

export interface DashboardStats {
  totalIncidents: number;
  incidentsByStatus: Record<IncidentStatus, number>;
  incidentsBySeverity: Record<IncidentSeverity, number>;
  incidentsByCategory: Record<IncidentCategory, number>;
  totalActions: number;
  actionsByStatus: Record<ActionStatus, number>;
  actionsEnRetard: number;
  actionsBloquees: number;
  actionsAVerifier: number;
  actionsCloturees: number;
  tauxEfficacite: number;
  actionsRecidives: number;
  agingMoyenJours: number;
  incidentsRecents: { id: string; title: string; severity: IncidentSeverity; status: IncidentStatus; createdAt: string }[];
}

const EMPTY_STATUS: Record<IncidentStatus, number> = {
  declare: 0,
  en_cours: 0,
  resolu: 0,
  cloture: 0,
};

const EMPTY_SEVERITY: Record<IncidentSeverity, number> = {
  faible: 0,
  moyenne: 0,
  elevee: 0,
  critique: 0,
};

const EMPTY_CATEGORY: Record<IncidentCategory, number> = {
  accident_travail: 0,
  presque_accident: 0,
  risque_identifie: 0,
  non_conformite: 0,
  environnement: 0,
  materiel: 0,
  autre: 0,
};

const EMPTY_ACTION_STATUS: Record<ActionStatus, number> = {
  brouillon: 0,
  ouverte: 0,
  en_cours: 0,
  bloquee: 0,
  a_verifier: 0,
  cloturee: 0,
  rejetee: 0,
  reouverte: 0,
  a_faire: 0,
  termine: 0,
};

/**
 * Calcule les statistiques QHSE visibles par l'utilisateur courant.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const [incidentsResult, actionsResult] = await Promise.all([
    supabase
      .from("incidents")
      .select("id, title, status, severity, category, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("actions_correctives")
      .select("status, echeance, is_blocked, efficacite_statut, parent_action_id, created_at, cloture_at"),
  ]);

  const incidents = incidentsResult.data ?? [];
  const actions = actionsResult.data ?? [];

  const incidentsByStatus = { ...EMPTY_STATUS };
  const incidentsBySeverity = { ...EMPTY_SEVERITY };
  const incidentsByCategory = { ...EMPTY_CATEGORY };

  for (const incident of incidents) {
    if (incidentsByStatus[incident.status as IncidentStatus] !== undefined) {
      incidentsByStatus[incident.status as IncidentStatus]++;
    }
    if (incidentsBySeverity[incident.severity as IncidentSeverity] !== undefined) {
      incidentsBySeverity[incident.severity as IncidentSeverity]++;
    }
    if (incidentsByCategory[incident.category as IncidentCategory] !== undefined) {
      incidentsByCategory[incident.category as IncidentCategory]++;
    }
  }

  const actionsByStatus = { ...EMPTY_ACTION_STATUS };
  const today = new Date(new Date().toDateString());
  let actionsEnRetard = 0;
  let actionsBloquees = 0;
  let actionsAVerifier = 0;
  let actionsCloturees = 0;
  let actionsEfficaces = 0;
  let actionsEvaluees = 0;
  let actionsRecidives = 0;
  let totalAgingDays = 0;
  let activeActionsCount = 0;

  const nowMs = Date.now();

  for (const action of actions) {
    let st: ActionStatus = action.status as ActionStatus;

    if ((st as string) === "a_faire") st = "ouverte";
    if ((st as string) === "termine") st = "cloturee";

    actionsByStatus[st] = (actionsByStatus[st] || 0) + 1;

    if (action.is_blocked || st === "bloquee") {
      actionsBloquees++;
    }

    if (st === "a_verifier") {
      actionsAVerifier++;
    }

    if (st === "cloturee") {
      actionsCloturees++;
    }

    if (action.parent_action_id) {
      actionsRecidives++;
    }

    if (action.efficacite_statut === "efficace" || action.efficacite_statut === "partiellement_efficace") {
      actionsEfficaces++;
      actionsEvaluees++;
    } else if (action.efficacite_statut === "inefficace") {
      actionsEvaluees++;
    }

    if (st !== "cloturee" && st !== "rejetee") {
      activeActionsCount++;
      const createdMs = new Date(action.created_at).getTime();
      const diffDays = Math.max(0, Math.floor((nowMs - createdMs) / 86400000));
      totalAgingDays += diffDays;

      if (new Date(action.echeance) < today) {
        actionsEnRetard++;
      }
    }
  }

  const tauxEfficacite = actionsEvaluees > 0 ? Math.round((actionsEfficaces / actionsEvaluees) * 100) : 100;
  const agingMoyenJours = activeActionsCount > 0 ? Math.round(totalAgingDays / activeActionsCount) : 0;

  return {
    totalIncidents: incidents.length,
    incidentsByStatus,
    incidentsBySeverity,
    incidentsByCategory,
    totalActions: actions.length,
    actionsByStatus,
    actionsEnRetard,
    actionsBloquees,
    actionsAVerifier,
    actionsCloturees,
    tauxEfficacite,
    actionsRecidives,
    agingMoyenJours,
    incidentsRecents: incidents.slice(0, 5).map((i) => ({
      id: i.id,
      title: i.title,
      severity: i.severity as IncidentSeverity,
      status: i.status as IncidentStatus,
      createdAt: i.created_at,
    })),
  };
}
