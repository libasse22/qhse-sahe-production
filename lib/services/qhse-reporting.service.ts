"use server";

import { createClient } from "@/lib/supabase/server";
import { createDocument } from "@/lib/services/documents.service";
import type { ActionResult } from "@/lib/services/auth.service";

export interface QhseMetric {
  label: string;
  value: number | string;
  denominator?: number;
  unit?: string;
  status: "OK" | "WARNING" | "CRITICAL" | "NA";
  isNa: boolean;
  description?: string;
}

export interface QhseReportData {
  companyName: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  generatedByName: string;

  // Executive summary
  globalComplianceScore: number | null;
  globalStatus: "CONFORME" | "ATTENTION" | "CRITIQUE" | "NA";

  // Section 1: Incidents
  incidents: {
    total: QhseMetric;
    faible: number;
    moyenne: number;
    elevee: number;
    critique: number;
    traites: number;
    enCours: number;
    tauxTraitement: QhseMetric;
    items: Array<{ id: string; title: string; category: string; severity: string; status: string; date: string }>;
  };

  // Section 2: Inspections & Audits
  inspections: {
    total: QhseMetric;
    conformesCount: number;
    nonConformesCount: number;
    tauxConformite: QhseMetric;
    items: Array<{ id: string; title: string; inspector: string; completedAt: string; status: string }>;
  };

  // Section 3: CAPA (Actions Correctives)
  capa: {
    total: QhseMetric;
    ouvertes: number;
    enCours: number;
    bloquees: number;
    enRetard: number;
    aVerifier: number;
    cloturees: number;
    tauxCloture: QhseMetric;
    items: Array<{ id: string; code: string; title: string; responsable: string; echeance: string; status: string; isBlocked: boolean; isOverdue: boolean }>;
  };

  // Section 4: Permis de Travail (PtW)
  permits: {
    total: QhseMetric;
    actifs: number;
    suspendus: number;
    clotures: number;
    expiresOuEcheance: number;
    items: Array<{ id: string; reference: string; title: string; type: string; status: string; applicant: string; startTime: string; endTime: string }>;
  };

  // Section 5: EPI
  epi: {
    totalAttribues: QhseMetric;
    enService: number;
    aRenouveler: number;
    defectueux: number;
    tauxConformite: QhseMetric;
    items: Array<{ id: string; recipient: string; catalogName: string; category: string; status: string; condition: string; renewalDueAt: string | null }>;
  };

  // Section 6: Points d'Attention & Anomalies
  attentionPoints: Array<{
    id: string;
    domain: "Incident" | "CAPA" | "Permis" | "EPI" | "Inspection";
    severity: "CRITICAL" | "WARNING";
    title: string;
    description: string;
  }>;
}

export async function getMonthlyQhseReport(
  inputStartDate?: string,
  inputEndDate?: string
): Promise<QhseReportData> {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();

  let generatedByName = "Responsable QHSE";
  let companyName = "QHSE Duo Sénégal";

  if (userRes?.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, company:companies(name)")
      .eq("id", userRes.user.id)
      .maybeSingle();

    if (profile?.full_name) generatedByName = profile.full_name;
    if ((profile as any)?.company?.name) companyName = (profile as any).company.name;
  }

  // Calculate default month range if not provided
  const now = new Date();
  const startOfDefaultMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfDefaultMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const startIso = inputStartDate ? new Date(inputStartDate).toISOString() : startOfDefaultMonth.toISOString();
  const endIso = inputEndDate ? new Date(inputEndDate).toISOString() : endOfDefaultMonth.toISOString();

  const periodLabel = `${new Date(startIso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;

  // 1. INCIDENTS QUERY
  const { data: rawIncidents } = await supabase
    .from("incidents")
    .select("id, title, category, severity, status, created_at, reported_by_profile:profiles!incidents_reported_by_fkey(full_name)")
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .order("created_at", { ascending: false });

  const incidentsList = (rawIncidents || []).map((i: any) => ({
    id: i.id,
    title: i.title,
    category: i.category || "autre",
    severity: i.severity || "faible",
    status: i.status || "declare",
    date: new Date(i.created_at).toLocaleDateString("fr-FR"),
  }));

  const incTotal = incidentsList.length;
  const incFaible = incidentsList.filter((i) => i.severity === "faible").length;
  const incMoyenne = incidentsList.filter((i) => i.severity === "moyenne").length;
  const incElevee = incidentsList.filter((i) => i.severity === "elevee").length;
  const incCritique = incidentsList.filter((i) => i.severity === "critique").length;
  const incTraites = incidentsList.filter((i) => i.status === "traite" || i.status === "cloture").length;
  const incEnCours = incidentsList.filter((i) => i.status === "en_cours" || i.status === "declare").length;

  const incTauxTraitement: QhseMetric = incTotal > 0
    ? {
        label: "Taux de traitement incidents",
        value: `${Math.round((incTraites / incTotal) * 100)}%`,
        denominator: incTotal,
        unit: "%",
        status: incTraites === incTotal ? "OK" : incCritique > 0 ? "CRITICAL" : "WARNING",
        isNa: false,
      }
    : {
        label: "Taux de traitement incidents",
        value: "N/A",
        status: "NA",
        isNa: true,
        description: "Aucun incident signalé sur la période",
      };

  // 2. INSPECTIONS QUERY
  const { data: rawInspections } = await supabase
    .from("inspection_runs")
    .select("id, title, status, completed_at, inspector_name, answers")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  const inspectionsList = (rawInspections || []).map((ins: any) => ({
    id: ins.id,
    title: ins.title,
    inspector: ins.inspector_name || "Inspecteur",
    completedAt: ins.completed_at ? new Date(ins.completed_at).toLocaleDateString("fr-FR") : "—",
    status: ins.status || "termine",
  }));

  const inspTotal = inspectionsList.length;
  let inspConformes = 0;
  let inspNonConformes = 0;

  (rawInspections || []).forEach((ins: any) => {
    const answers = ins.answers || {};
    const values = Object.values(answers) as any[];
    const hasNc = values.some((v) => v?.status === "non_conforme");
    if (hasNc) inspNonConformes++;
    else inspConformes++;
  });

  const inspTauxConformite: QhseMetric = inspTotal > 0
    ? {
        label: "Taux de conformité inspections",
        value: `${Math.round((inspConformes / inspTotal) * 100)}%`,
        denominator: inspTotal,
        unit: "%",
        status: inspConformes === inspTotal ? "OK" : "WARNING",
        isNa: false,
      }
    : {
        label: "Taux de conformité inspections",
        value: "N/A",
        status: "NA",
        isNa: true,
        description: "Aucune inspection exécutée sur la période",
      };

  // 3. CAPA (ACTIONS CORRECTIVES) QUERY
  const { data: rawActions } = await supabase
    .from("actions_correctives")
    .select("id, code_reference, description, echeance, status, is_blocked, blocked_reason, responsable:profiles!actions_correctives_responsable_id_fkey(full_name)")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  const nowMs = new Date().getTime();
  const capaItems = (rawActions || []).map((a: any) => {
    const isOverdue = a.status !== "cloturee" && a.echeance && new Date(a.echeance).getTime() < nowMs;
    return {
      id: a.id,
      code: a.code_reference || `ACT-${a.id.substring(0, 4)}`,
      title: a.description,
      responsable: a.responsable?.full_name || "Responsable",
      echeance: a.echeance ? new Date(a.echeance).toLocaleDateString("fr-FR") : "—",
      status: a.status || "a_traiter",
      isBlocked: Boolean(a.is_blocked),
      isOverdue: Boolean(isOverdue),
    };
  });

  const capaTotal = capaItems.length;
  const capaOuvertes = capaItems.filter((a) => a.status === "a_traiter").length;
  const capaEnCours = capaItems.filter((a) => a.status === "en_cours").length;
  const capaBloquees = capaItems.filter((a) => a.isBlocked).length;
  const capaEnRetard = capaItems.filter((a) => a.isOverdue).length;
  const capaAVerifier = capaItems.filter((a) => a.status === "en_attente_verification").length;
  const capaCloturees = capaItems.filter((a) => a.status === "cloturee").length;

  const capaTauxCloture: QhseMetric = capaTotal > 0
    ? {
        label: "Taux de clôture CAPA",
        value: `${Math.round((capaCloturees / capaTotal) * 100)}%`,
        denominator: capaTotal,
        unit: "%",
        status: capaBloquees > 0 || capaEnRetard > 0 ? "CRITICAL" : capaCloturees === capaTotal ? "OK" : "WARNING",
        isNa: false,
      }
    : {
        label: "Taux de clôture CAPA",
        value: "N/A",
        status: "NA",
        isNa: true,
        description: "Aucune action CAPA enregistrée sur la période",
      };

  // 4. PERMIS DE TRAVAIL (PTW) QUERY
  const { data: rawPermits } = await supabase
    .from("work_permits")
    .select("id, reference, title, permit_type, status, start_time, end_time, applicant:profiles!work_permits_applicant_id_fkey(full_name)")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  const twoHoursMs = 2 * 60 * 60 * 1000;
  const permitItems = (rawPermits || []).map((p: any) => ({
    id: p.id,
    reference: p.reference,
    title: p.title,
    type: p.permit_type,
    status: p.status,
    applicant: p.applicant?.full_name || "Demandeur",
    startTime: new Date(p.start_time).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }),
    endTime: new Date(p.end_time).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }),
  }));

  const ptwTotal = permitItems.length;
  const ptwActifs = permitItems.filter((p) => p.status === "en_cours").length;
  const ptwSuspendus = permitItems.filter((p) => p.status === "suspendu").length;
  const ptwClotures = permitItems.filter((p) => p.status === "cloture").length;
  const ptwExpires = (rawPermits || []).filter((p: any) => {
    const endMs = new Date(p.end_time).getTime();
    return p.status === "en_cours" && endMs - nowMs <= twoHoursMs;
  }).length;

  const ptwMetric: QhseMetric = ptwTotal > 0
    ? {
        label: "Permis de Travail délivrés",
        value: ptwTotal,
        unit: "PTW",
        status: ptwSuspendus > 0 ? "WARNING" : "OK",
        isNa: false,
      }
    : {
        label: "Permis de Travail délivrés",
        value: "N/A",
        status: "NA",
        isNa: true,
        description: "Aucun permis de travail émis sur la période",
      };

  // 5. EPI QUERY
  const { data: rawEpi } = await supabase
    .from("epi_assignments")
    .select("id, status, condition_state, renewal_due_at, recipient:profiles!epi_assignments_recipient_id_fkey(full_name), catalog:epi_catalog(name, category)");

  const epiItems = (rawEpi || []).map((e: any) => ({
    id: e.id,
    recipient: e.recipient?.full_name || "Employé",
    catalogName: e.catalog?.name || "EPI",
    category: e.catalog?.category || "autre",
    status: e.status || "attribue",
    condition: e.condition_state || "bon",
    renewalDueAt: e.renewal_due_at ? new Date(e.renewal_due_at).toLocaleDateString("fr-FR") : null,
  }));

  const epiTotal = epiItems.length;
  const epiEnService = epiItems.filter((e) => e.status === "en_service" || e.status === "attribue").length;
  const epiARenouveler = epiItems.filter((e) => e.status === "a_renouveler").length;
  const epiDefectueux = epiItems.filter((e) => e.condition === "defectueux" || e.status === "perdu_endommage").length;
  const epiConformes = epiEnService - epiDefectueux;

  const epiTauxConformite: QhseMetric = epiTotal > 0
    ? {
        label: "Taux de conformité EPI",
        value: `${Math.max(0, Math.round((epiConformes / epiTotal) * 100))}%`,
        denominator: epiTotal,
        unit: "%",
        status: epiDefectueux > 0 ? "CRITICAL" : epiARenouveler > 0 ? "WARNING" : "OK",
        isNa: false,
      }
    : {
        label: "Taux de conformité EPI",
        value: "N/A",
        status: "NA",
        isNa: true,
        description: "Aucun EPI enregistré en base de données",
      };

  // 6. GENERATE ATTENTION POINTS & ANOMALIES
  const attentionPoints: QhseReportData["attentionPoints"] = [];

  if (incCritique > 0) {
    attentionPoints.push({
      id: "att-inc-crit",
      domain: "Incident",
      severity: "CRITICAL",
      title: `${incCritique} incident(s) à gravité critique enregistré(s)`,
      description: "Une révision d'urgence des barrières de sécurité et une étude de cause racine (5 Pourquoi) sont requises.",
    });
  }

  if (capaBloquees > 0) {
    attentionPoints.push({
      id: "att-capa-block",
      domain: "CAPA",
      severity: "CRITICAL",
      title: `${capaBloquees} action(s) CAPA bloquée(s)`,
      description: "Des blocages opérationnels ou budgétaires empêchent la réalisation de plans d'action correctifs.",
    });
  }

  if (capaEnRetard > 0) {
    attentionPoints.push({
      id: "att-capa-overdue",
      domain: "CAPA",
      severity: "WARNING",
      title: `${capaEnRetard} action(s) CAPA en retard d'échéance`,
      description: "Des dates d'échéances ont été dépassées sans clôture ou demande formelle de prolongation.",
    });
  }

  if (ptwSuspendus > 0) {
    attentionPoints.push({
      id: "att-ptw-susp",
      domain: "Permis",
      severity: "WARNING",
      title: `${ptwSuspendus} permis de travail suspendu(s)`,
      description: "Des non-conformités chantiers ont déclenché l'arrêt temporaire de travaux à haut risque.",
    });
  }

  if (epiDefectueux > 0) {
    attentionPoints.push({
      id: "att-epi-def",
      domain: "EPI",
      severity: "CRITICAL",
      title: `${epiDefectueux} EPI défectueux ou endommagé(s) non remplacé(s)`,
      description: "Des intervenants travaillent potentiellement avec des EPI déclassés ou hors service.",
    });
  }

  // Calculate Global Compliance Score
  const evaluatedMetrics = [incTauxTraitement, inspTauxConformite, capaTauxCloture, epiTauxConformite].filter((m) => !m.isNa);
  let globalComplianceScore: number | null = null;
  let globalStatus: QhseReportData["globalStatus"] = "NA";

  if (evaluatedMetrics.length > 0) {
    const sum = evaluatedMetrics.reduce((acc, m) => {
      const numericVal = parseInt(String(m.value).replace("%", ""), 10);
      return acc + (isNaN(numericVal) ? 100 : numericVal);
    }, 0);
    globalComplianceScore = Math.round(sum / evaluatedMetrics.length);
    globalStatus = globalComplianceScore >= 85 ? "CONFORME" : globalComplianceScore >= 65 ? "ATTENTION" : "CRITIQUE";
  }

  return {
    companyName,
    periodLabel,
    startDate: new Date(startIso).toLocaleDateString("fr-FR"),
    endDate: new Date(endIso).toLocaleDateString("fr-FR"),
    generatedAt: new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }),
    generatedByName,
    globalComplianceScore,
    globalStatus,
    incidents: {
      total: { label: "Incidents Totaux", value: incTotal, unit: "incidents", status: incTotal > 0 ? "WARNING" : "OK", isNa: false },
      faible: incFaible,
      moyenne: incMoyenne,
      elevee: incElevee,
      critique: incCritique,
      traites: incTraites,
      enCours: incEnCours,
      tauxTraitement: incTauxTraitement,
      items: incidentsList,
    },
    inspections: {
      total: { label: "Inspections Réalisées", value: inspTotal, unit: "inspections", status: "OK", isNa: false },
      conformesCount: inspConformes,
      nonConformesCount: inspNonConformes,
      tauxConformite: inspTauxConformite,
      items: inspectionsList,
    },
    capa: {
      total: { label: "Actions CAPA Totales", value: capaTotal, unit: "actions", status: "OK", isNa: false },
      ouvertes: capaOuvertes,
      enCours: capaEnCours,
      bloquees: capaBloquees,
      enRetard: capaEnRetard,
      aVerifier: capaAVerifier,
      cloturees: capaCloturees,
      tauxCloture: capaTauxCloture,
      items: capaItems,
    },
    permits: {
      total: ptwMetric,
      actifs: ptwActifs,
      suspendus: ptwSuspendus,
      clotures: ptwClotures,
      expiresOuEcheance: ptwExpires,
      items: permitItems,
    },
    epi: {
      totalAttribues: { label: "Dotations EPI", value: epiTotal, unit: "EPI", status: "OK", isNa: false },
      enService: epiEnService,
      aRenouveler: epiARenouveler,
      defectueux: epiDefectueux,
      tauxConformite: epiTauxConformite,
      items: epiItems,
    },
    attentionPoints,
  };
}

export async function saveQhseReportToGed(params: {
  reportData: QhseReportData;
  storagePath?: string;
}): Promise<ActionResult & { documentId?: string; codeReference?: string }> {
  try {
    const title = `Bilan Mensuel QHSE — ${params.reportData.periodLabel}`;
    const category = "Rapports Mensuels";
    const defaultStoragePath = params.storagePath || `reports/rapport_qhse_${Date.now()}.pdf`;

    const res = await createDocument({
      title,
      category,
      documentType: "rapport",
      domaineQhse: "securite",
      storagePath: defaultStoragePath,
      tags: ["reporting", "bilan_mensuel", "qhse"],
    });

    return res;
  } catch {
    return { error: "Impossible d'enregistrer le rapport dans la GED." };
  }
}
