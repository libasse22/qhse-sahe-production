"use server";

import { createClient } from "@/lib/supabase/server";

export type CockpitItemPriority = "urgent" | "a_traiter" | "info";
export type CockpitItemCategory = "incident" | "action" | "audit" | "risk" | "equipment" | "document";

export interface CockpitItem {
  id: string;
  title: string;
  subtitle: string | null;
  category: CockpitItemCategory;
  priority: CockpitItemPriority;
  badgeText: string;
  badgeVariant: "destructive" | "warning" | "success" | "secondary" | "outline";
  assignedTo: string | null;
  dateLabel: string;
  isOverdue?: boolean;
  href: string;
}

export interface CockpitData {
  urgentItems: CockpitItem[];
  aTraiterItems: CockpitItem[];
  infoItems: CockpitItem[];
  stats: {
    totalIncidents: number;
    incidentsEnCours: number;
    actionsEnRetard: number;
    tauxResolution: number;
    incidentsBySeverity: Record<string, number>;
    incidentsByStatus: Record<string, number>;
    incidentsByCategory: Record<string, number>;
    actionsByStatus: Record<string, number>;
  };
}

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "Date non précisée";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "Date invalide";
  }
}

function calculateDaysDifference(targetIso: string): number {
  const target = new Date(new Date(targetIso).toDateString());
  const today = new Date(new Date().toDateString());
  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export async function getCockpitData(): Promise<CockpitData> {
  const supabase = await createClient();
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);
  const in7DaysISO = in7Days.toISOString();

  // Exécution parallèle des requêtes sécurisées par RLS Supabase
  const [
    incidentsRes,
    actionsRes,
    risksRes,
    auditsRes,
    equipmentRes,
  ] = await Promise.all([
    supabase
      .from("incidents")
      .select("id, title, description, category, severity, status, location, occurred_at, reported_by, assigned_to, reporter:profiles!incidents_reported_by_fkey(full_name), assignee:profiles!incidents_assigned_to_fkey(full_name)")
      .order("created_at", { ascending: false }),

    supabase
      .from("actions_correctives")
      .select("id, incident_id, description, responsable_id, echeance, status, created_at, updated_at, responsable:profiles!actions_responsable_id_fkey(full_name), incident:incidents(title, location)")
      .order("echeance", { ascending: true }),

    supabase
      .from("risks")
      .select("id, title, category, initial_severity, residual_severity, mitigation_plan")
      .or("residual_severity.eq.critique,and(residual_severity.is.null,initial_severity.eq.critique)"),

    supabase
      .from("audits")
      .select("id, title, audit_type, status, date_debut, date_fin, auditor:profiles(full_name)")
      .eq("status", "planifie")
      .lte("date_debut", in7DaysISO),

    supabase
      .from("equipment")
      .select("id, name, code, category, status, next_inspection_date")
      .lte("next_inspection_date", in7DaysISO),
  ]);

  const incidents = incidentsRes.data ?? [];
  const actions = actionsRes.data ?? [];
  const risks = risksRes.data ?? [];
  const audits = auditsRes.data ?? [];
  const equipmentList = equipmentRes.data ?? [];

  const urgentItems: CockpitItem[] = [];
  const aTraiterItems: CockpitItem[] = [];
  const infoItems: CockpitItem[] = [];

  // --- 1. CLASSIFICATION DES INCIDENTS ---
  let totalIncidents = incidents.length;
  let incidentsResolusEtClotures = 0;
  const incidentsBySeverity: Record<string, number> = { faible: 0, moyenne: 0, elevee: 0, critique: 0 };
  const incidentsByStatus: Record<string, number> = { declare: 0, en_cours: 0, resolu: 0, cloture: 0 };
  const incidentsByCategory: Record<string, number> = {};

  for (const inc of incidents) {
    if (inc.severity) incidentsBySeverity[inc.severity] = (incidentsBySeverity[inc.severity] || 0) + 1;
    if (inc.status) incidentsByStatus[inc.status] = (incidentsByStatus[inc.status] || 0) + 1;
    if (inc.category) incidentsByCategory[inc.category] = (incidentsByCategory[inc.category] || 0) + 1;

    if (inc.status === "resolu" || inc.status === "cloture") {
      incidentsResolusEtClotures++;
    }

    // 🔴 URGENT : Incidents critiques non résolus
    if (inc.severity === "critique" && (inc.status === "declare" || inc.status === "en_cours")) {
      const reporterName = inc.reporter ? (inc.reporter as unknown as { full_name: string }).full_name : null;
      const assigneeName = inc.assignee ? (inc.assignee as unknown as { full_name: string }).full_name : null;

      urgentItems.push({
        id: `inc-${inc.id}`,
        title: inc.title,
        subtitle: inc.location ? `Lieu : ${inc.location}` : reporterName ? `Déclaré par : ${reporterName}` : null,
        category: "incident",
        priority: "urgent",
        badgeText: "Incident Critique",
        badgeVariant: "destructive",
        assignedTo: assigneeName ?? reporterName,
        dateLabel: `Survenu le ${formatDate(inc.occurred_at)}`,
        isOverdue: true,
        href: `/incidents/${inc.id}`,
      });
    } else {
      // 🟢 INFO : Derniers signalements généraux
      if (infoItems.length < 5) {
        infoItems.push({
          id: `inc-info-${inc.id}`,
          title: inc.title,
          subtitle: inc.location ? `Lieu : ${inc.location}` : null,
          category: "incident",
          priority: "info",
          badgeText: inc.status === "cloture" ? "Clôturé" : inc.status === "resolu" ? "Résolu" : "En cours",
          badgeVariant: inc.status === "resolu" ? "success" : "secondary",
          assignedTo: null,
          dateLabel: formatDate(inc.occurred_at),
          href: `/incidents/${inc.id}`,
        });
      }
    }
  }

  // --- 2. CLASSIFICATION DES ACTIONS CORRECTIVES ---
  let actionsEnRetardCount = 0;
  const actionsByStatus: Record<string, number> = { a_faire: 0, en_cours: 0, termine: 0 };
  const todayDate = new Date(new Date().toDateString());

  for (const act of actions) {
    if (act.status) actionsByStatus[act.status] = (actionsByStatus[act.status] || 0) + 1;
    const respName = act.responsable ? (act.responsable as unknown as { full_name: string }).full_name : null;
    const incInfo = act.incident as unknown as { title: string; location: string } | null;
    const echeanceDate = new Date(act.echeance);

    if (act.status !== "termine") {
      const daysDiff = calculateDaysDifference(act.echeance);

      if (echeanceDate < todayDate) {
        // 🔴 URGENT : Action corrective en retard
        actionsEnRetardCount++;
        const absDays = Math.abs(daysDiff);
        urgentItems.push({
          id: `act-${act.id}`,
          title: act.description,
          subtitle: incInfo?.title ? `Incident : ${incInfo.title}` : null,
          category: "action",
          priority: "urgent",
          badgeText: `Retard de ${absDays} j`,
          badgeVariant: "destructive",
          assignedTo: respName,
          dateLabel: `Échéance dépassée (${formatDate(act.echeance)})`,
          isOverdue: true,
          href: `/actions`,
        });
      } else if (daysDiff <= 7) {
        // 🟠 À TRAITER : Action sous 7 jours
        const label = daysDiff === 0 ? "Échéance Aujourd'hui" : `Dans ${daysDiff} j`;
        aTraiterItems.push({
          id: `act-soon-${act.id}`,
          title: act.description,
          subtitle: incInfo?.title ? `Incident : ${incInfo.title}` : null,
          category: "action",
          priority: "a_traiter",
          badgeText: label,
          badgeVariant: "warning",
          assignedTo: respName,
          dateLabel: `Échéance le ${formatDate(act.echeance)}`,
          href: `/actions`,
        });
      }
    } else {
      // 🟢 INFO : Action récemment terminée
      if (infoItems.length < 10) {
        infoItems.push({
          id: `act-term-${act.id}`,
          title: act.description,
          subtitle: "Action réalisée avec succès",
          category: "action",
          priority: "info",
          badgeText: "Terminée",
          badgeVariant: "success",
          assignedTo: respName,
          dateLabel: `Clôturée le ${formatDate(act.updated_at)}`,
          href: `/actions`,
        });
      }
    }
  }

  // --- 3. CLASSIFICATION DES RISQUES CRITIQUES ---
  for (const risk of risks) {
    urgentItems.push({
      id: `risk-${risk.id}`,
      title: risk.title,
      subtitle: risk.mitigation_plan ? `Plan : ${risk.mitigation_plan}` : "Mesures de prévention à renforcer",
      category: "risk",
      priority: "urgent",
      badgeText: "Risque Critique",
      badgeVariant: "destructive",
      assignedTo: null,
      dateLabel: `Catégorie : ${risk.category}`,
      isOverdue: true,
      href: `/risques`,
    });
  }

  // --- 4. CLASSIFICATION DES AUDITS À TRAITER ---
  for (const audit of audits) {
    const auditorName = audit.auditor ? (audit.auditor as unknown as { full_name: string }).full_name : null;
    aTraiterItems.push({
      id: `audit-${audit.id}`,
      title: audit.title,
      subtitle: `Audit ${audit.audit_type}`,
      category: "audit",
      priority: "a_traiter",
      badgeText: "Audit Planifié",
      badgeVariant: "warning",
      assignedTo: auditorName,
      dateLabel: `Début le ${formatDate(audit.date_debut)}`,
      href: `/audits/${audit.id}`,
    });
  }

  // --- 5. CLASSIFICATION DES ÉQUIPEMENTS À CONTRÔLER ---
  for (const eq of equipmentList) {
    if (eq.next_inspection_date) {
      const daysDiff = calculateDaysDifference(eq.next_inspection_date);
      if (daysDiff < 0) {
        // 🔴 URGENT : Contrôle équipement dépassé
        urgentItems.push({
          id: `eq-over-${eq.id}`,
          title: `${eq.name} (${eq.code})`,
          subtitle: `Catégorie : ${eq.category}`,
          category: "equipment",
          priority: "urgent",
          badgeText: "Contrôle Dépassé",
          badgeVariant: "destructive",
          assignedTo: null,
          dateLabel: `Prévu le ${formatDate(eq.next_inspection_date)}`,
          isOverdue: true,
          href: `/equipements/${eq.id}`,
        });
      } else {
        // 🟠 À TRAITER : Contrôle équipement sous 7j
        aTraiterItems.push({
          id: `eq-${eq.id}`,
          title: `${eq.name} (${eq.code})`,
          subtitle: `Contrôle réglementaire périodique`,
          category: "equipment",
          priority: "a_traiter",
          badgeText: `Contrôle à ${daysDiff} j`,
          badgeVariant: "warning",
          assignedTo: null,
          dateLabel: `Échéance le ${formatDate(eq.next_inspection_date)}`,
          href: `/equipements/${eq.id}`,
        });
      }
    }
  }

  const tauxResolution = totalIncidents === 0 ? 0 : Math.round((incidentsResolusEtClotures / totalIncidents) * 100);

  return {
    urgentItems,
    aTraiterItems,
    infoItems,
    stats: {
      totalIncidents,
      incidentsEnCours: incidentsByStatus.en_cours ?? 0,
      actionsEnRetard: actionsEnRetardCount,
      tauxResolution,
      incidentsBySeverity,
      incidentsByStatus,
      incidentsByCategory,
      actionsByStatus,
    },
  };
}
