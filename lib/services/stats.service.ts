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
  a_faire: 0,
  en_cours: 0,
  termine: 0,
};

/**
 * Calcule les statistiques QHSE visibles par l'utilisateur courant. La RLS
 * s'applique aux deux requêtes sous-jacentes : un employé ne voit que ses
 * propres incidents/actions, un manager QHSE ou admin voit l'ensemble.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const [incidentsResult, actionsResult] = await Promise.all([
    supabase
      .from("incidents")
      .select("id, title, status, severity, category, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("actions_correctives").select("status, echeance"),
  ]);

  const incidents = incidentsResult.data ?? [];
  const actions = actionsResult.data ?? [];

  const incidentsByStatus = { ...EMPTY_STATUS };
  const incidentsBySeverity = { ...EMPTY_SEVERITY };
  const incidentsByCategory = { ...EMPTY_CATEGORY };

  for (const incident of incidents) {
    incidentsByStatus[incident.status as IncidentStatus]++;
    incidentsBySeverity[incident.severity as IncidentSeverity]++;
    incidentsByCategory[incident.category as IncidentCategory]++;
  }

  const actionsByStatus = { ...EMPTY_ACTION_STATUS };
  const today = new Date(new Date().toDateString());
  let actionsEnRetard = 0;

  for (const action of actions) {
    actionsByStatus[action.status as ActionStatus]++;
    if (action.status !== "termine" && new Date(action.echeance) < today) {
      actionsEnRetard++;
    }
  }

  return {
    totalIncidents: incidents.length,
    incidentsByStatus,
    incidentsBySeverity,
    incidentsByCategory,
    totalActions: actions.length,
    actionsByStatus,
    actionsEnRetard,
    incidentsRecents: incidents.slice(0, 5).map((i) => ({
      id: i.id,
      title: i.title,
      severity: i.severity as IncidentSeverity,
      status: i.status as IncidentStatus,
      createdAt: i.created_at,
    })),
  };
}
