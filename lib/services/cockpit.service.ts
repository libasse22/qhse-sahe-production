"use server";

import { createClient } from "@/lib/supabase/server";

export type CockpitItemPriority = "urgent" | "a_traiter" | "info";
export type CockpitItemCategory = "incident" | "action" | "audit" | "risk" | "equipment" | "document" | "permit" | "epi" | "inspection";

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
  permitsKpi: {
    total: number;
    actifs: number;
    suspendus: number;
    enAttente: number;
    expirantMoins2h: number;
    necessitantAction: number;
  };
  epiKpi: {
    total: number;
    enService: number;
    expires: number;
    defectueux: number;
    aRenouveler: number;
    echeanceMois: number;
    necessitantAction: number;
  };
  capaKpi: {
    total: number;
    ouvertes: number;
    enCours: number;
    bloquees: number;
    enRetard: number;
    aVerifier: number;
    cloturees: number;
    tauxEfficaciteLabel: string;
    tauxClotureLabel: string;
  };
  auditsKpi: {
    total: number;
    actifs: number;
    pointsNc: number;
    pointsNonEvalues: number;
    preuvesManquantes: number;
  };
  inspectionsKpi: {
    total: number;
    enCours: number;
    nonConformes: number;
    completedCount: number;
  };
  gedKpi: {
    total: number;
    enRevision: number;
    echeanceRevue: number;
    signaturesEnAttente: number;
    aVerifierExterne: number;
    expires: number;
  };
  risksKpi: {
    total: number;
    critiques: number;
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
  const now = new Date();
  const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);
  const in7DaysISO = in7Days.toISOString();

  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);

  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Exécution parallèle de toutes les requêtes RLS sécurisées
  const [
    incidentsRes,
    actionsRes,
    risksRes,
    auditsRes,
    auditItemsRes,
    auditProofLinksRes,
    equipmentRes,
    permitsRes,
    epiRes,
    inspectionsRes,
    documentsRes,
    documentSignaturesRes,
    unverifiedRevisionsRes,
  ] = await Promise.all([
    supabase
      .from("incidents")
      .select("id, code_reference, title, description, category, severity, status, location, occurred_at, reported_by, assigned_to, reporter:profiles!incidents_reported_by_fkey(full_name), assignee:profiles!incidents_assigned_to_fkey(full_name)")
      .order("created_at", { ascending: false }),

    supabase
      .from("actions_correctives")
      .select("id, code_reference, incident_id, description, responsable_id, echeance, status, is_blocked, efficacite_statut, created_at, updated_at, responsable:profiles!actions_correctives_responsable_id_fkey(full_name), incident:incidents(title, location)")
      .order("echeance", { ascending: true }),

    supabase
      .from("risks")
      .select("id, title, category, initial_severity, residual_severity, mitigation_plan")
      .or("residual_severity.eq.critique,and(residual_severity.is.null,initial_severity.eq.critique)"),

    supabase
      .from("audits")
      .select("id, title, reference_framework, status, planned_date, start_date, end_date, auditor:profiles!audits_auditor_id_fkey(full_name)")
      .order("planned_date", { ascending: false }),

    supabase
      .from("audit_items")
      .select("id, audit_id, title, requirement, status, capa_action_id"),

    supabase
      .from("audit_proof_links")
      .select("id, audit_id, audit_item_id"),

    supabase
      .from("equipment")
      .select("id, name, code, category, status, next_inspection_date")
      .lte("next_inspection_date", in7DaysISO),

    supabase
      .from("work_permits")
      .select("id, permit_number, title, status, start_time, end_time, applicant:profiles!work_permits_applicant_id_fkey(full_name)")
      .order("start_time", { ascending: false }),

    supabase
      .from("epi_assignments")
      .select("id, status, condition_state, assigned_at, renewal_due_at, catalog_item:epi_catalog(name), employee:profiles!epi_assignments_employee_id_fkey(full_name)"),

    supabase
      .from("inspection_runs")
      .select("id, title, status, score_percentage, completed_at, inspector_name"),

    supabase
      .from("documents")
      .select("id, code_reference, title, status, origin_type, effective_date, review_date, expiry_date"),

    supabase
      .from("document_signatures")
      .select("id, document_id, signer_name, signed_at, role")
      .is("signed_at", null),

    supabase
      .from("document_revisions")
      .select("id, document_id, revision_code, verification_status")
      .eq("verification_status", "a_verifier"),
  ]);

  const incidents = incidentsRes.data ?? [];
  const actions = actionsRes.data ?? [];
  const risks = risksRes.data ?? [];
  const audits = auditsRes.data ?? [];
  const auditItems = auditItemsRes.data ?? [];
  const auditProofLinks = auditProofLinksRes.data ?? [];
  const equipmentList = equipmentRes.data ?? [];
  const permits = permitsRes.data ?? [];
  const epiAssignments = epiRes.data ?? [];
  const inspectionRuns = inspectionsRes.data ?? [];
  const documents = documentsRes.data ?? [];
  const pendingDocumentSignatures = documentSignaturesRes.data ?? [];
  const unverifiedRevisions = unverifiedRevisionsRes.data ?? [];

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

  // --- 2. CLASSIFICATION DES ACTIONS CORRECTIVES CAPA ---
  let actionsEnRetardCount = 0;
  let actionsBloqueesCount = 0;
  let actionsAVerifierCount = 0;
  let actionsClotureesCount = 0;
  let actionsOuvertesCount = 0;
  let actionsEnCoursCount = 0;
  let actionsEfficacesCount = 0;
  let actionsEvalueesCount = 0;
  const actionsByStatus: Record<string, number> = {};
  const todayDate = new Date(new Date().toDateString());

  for (const act of actions) {
    let statusStr = act.status as string;
    if (statusStr === "a_faire") statusStr = "ouverte";
    if (statusStr === "termine") statusStr = "cloturee";

    actionsByStatus[statusStr] = (actionsByStatus[statusStr] || 0) + 1;
    const respName = act.responsable ? (act.responsable as unknown as { full_name: string }).full_name : null;
    const incInfo = act.incident as unknown as { title: string; location: string } | null;
    const echeanceDate = new Date(act.echeance);
    const refPrefix = act.code_reference ? `[${act.code_reference}] ` : "";

    if (statusStr === "ouverte") actionsOuvertesCount++;
    if (statusStr === "en_cours") actionsEnCoursCount++;
    if (statusStr === "cloturee") actionsClotureesCount++;

    if (act.efficacite_statut === "efficace" || act.efficacite_statut === "partiellement_efficace") {
      actionsEfficacesCount++;
      actionsEvalueesCount++;
    } else if (act.efficacite_statut === "inefficace") {
      actionsEvalueesCount++;
    }

    // Action bloquée (Urgent)
    if (act.is_blocked || statusStr === "bloquee") {
      actionsBloqueesCount++;
      urgentItems.push({
        id: `act-blocked-${act.id}`,
        title: `${refPrefix}${act.description}`,
        subtitle: "🔴 Action CAPA bloquée (Intervention requise)",
        category: "action",
        priority: "urgent",
        badgeText: "Bloquée",
        badgeVariant: "destructive",
        assignedTo: respName,
        dateLabel: `Échéance le ${formatDate(act.echeance)}`,
        isOverdue: true,
        href: `/actions`,
      });
    } else if (statusStr !== "cloturee" && statusStr !== "rejetee") {
      const daysDiff = calculateDaysDifference(act.echeance);

      if (echeanceDate < todayDate) {
        // 🔴 URGENT : Action corrective en retard
        actionsEnRetardCount++;
        const absDays = Math.abs(daysDiff);
        urgentItems.push({
          id: `act-${act.id}`,
          title: `${refPrefix}${act.description}`,
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
      } else if (statusStr === "a_verifier") {
        actionsAVerifierCount++;
        // 🟠 À TRAITER : Action soumise à la vérification
        aTraiterItems.push({
          id: `act-verify-${act.id}`,
          title: `${refPrefix}${act.description}`,
          subtitle: "🎯 Action à vérifier et évaluer",
          category: "action",
          priority: "a_traiter",
          badgeText: "À vérifier",
          badgeVariant: "warning",
          assignedTo: respName,
          dateLabel: `Soumise le ${formatDate(act.updated_at)}`,
          href: `/actions`,
        });
      } else if (daysDiff <= 7) {
        // 🟠 À TRAITER : Action sous 7 jours
        const label = daysDiff === 0 ? "Échéance Aujourd'hui" : `Dans ${daysDiff} j`;
        aTraiterItems.push({
          id: `act-soon-${act.id}`,
          title: `${refPrefix}${act.description}`,
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
    } else if (statusStr === "cloturee") {
      if (infoItems.length < 10) {
        infoItems.push({
          id: `act-term-${act.id}`,
          title: `${refPrefix}${act.description}`,
          subtitle: "Action CAPA clôturée avec succès",
          category: "action",
          priority: "info",
          badgeText: "Clôturée",
          badgeVariant: "success",
          assignedTo: respName,
          dateLabel: `Clôturée le ${formatDate(act.updated_at)}`,
          href: `/actions`,
        });
      }
    }
  }

  // --- 3. CLASSIFICATION DES PERMIS DE TRAVAIL (PtW) ---
  let ptwActifs = 0;
  let ptwSuspendus = 0;
  let ptwEnAttente = 0;
  let ptwExpirantMoins2h = 0;

  for (const ptw of permits) {
    const applicantName = ptw.applicant ? (ptw.applicant as unknown as { full_name: string }).full_name : null;
    const ptwRef = ptw.permit_number ? `[Permis ${ptw.permit_number}] ` : "";

    if (ptw.status === "en_cours") ptwActifs++;
    if (ptw.status === "suspendu") ptwSuspendus++;
    if (ptw.status === "en_attente_validation") ptwEnAttente++;

    // Calcul déterministe serveur : Expiration dans moins de 2h
    if (ptw.status === "en_cours" && ptw.end_time) {
      const endTime = new Date(ptw.end_time);
      if (endTime > now && endTime <= in2Hours) {
        ptwExpirantMoins2h++;
        urgentItems.push({
          id: `ptw-exp-${ptw.id}`,
          title: `${ptwRef}${ptw.title}`,
          subtitle: "⚠️ Permis de travail expirant sous 2h",
          category: "permit",
          priority: "urgent",
          badgeText: "Expire < 2h",
          badgeVariant: "destructive",
          assignedTo: applicantName,
          dateLabel: `Fin prévue à ${new Date(ptw.end_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
          href: `/permis-de-travail/${ptw.id}`,
        });
      }
    }

    // 🔴 URGENT : Permis suspendu
    if (ptw.status === "suspendu") {
      urgentItems.push({
        id: `ptw-susp-${ptw.id}`,
        title: `${ptwRef}${ptw.title}`,
        subtitle: "⛔ Permis de travail suspendu (Sécurité)",
        category: "permit",
        priority: "urgent",
        badgeText: "Suspendu",
        badgeVariant: "destructive",
        assignedTo: applicantName,
        dateLabel: `Demandeur : ${applicantName || "—"}`,
        href: `/permis-de-travail/${ptw.id}`,
      });
    }

    // 🟠 À TRAITER : Permis en attente de validation
    if (ptw.status === "en_attente_validation") {
      aTraiterItems.push({
        id: `ptw-pending-${ptw.id}`,
        title: `${ptwRef}${ptw.title}`,
        subtitle: "📋 Permis soumis pour validation & signature",
        category: "permit",
        priority: "a_traiter",
        badgeText: "Validation requise",
        badgeVariant: "warning",
        assignedTo: applicantName,
        dateLabel: `Soumis pour ${formatDate(ptw.start_time)}`,
        href: `/permis-de-travail/${ptw.id}`,
      });
    }
  }

  const ptwNecessitantAction = ptwSuspendus + ptwEnAttente + ptwExpirantMoins2h;

  // --- 4. CLASSIFICATION EPI ---
  let epiExpiresCount = 0;
  let epiDefectueuxCount = 0;
  let epiARenouvelerCount = 0;
  let epiEcheanceMoisCount = 0;
  let epiEnServiceCount = 0;

  for (const epi of epiAssignments) {
    const itemName = (epi as any).catalog_item?.name || "Équipement EPI";
    const employeeName = (epi as any).employee?.full_name || "Employé";

    if (epi.status === "en_service") epiEnServiceCount++;
    if (epi.status === "a_renouveler") epiARenouvelerCount++;
    if (epi.status === "perdu_endommage" || epi.condition_state === "defectueux") epiDefectueuxCount++;

    if (epi.renewal_due_at) {
      const renewalDate = new Date(epi.renewal_due_at);
      if (renewalDate < now) {
        epiExpiresCount++;
        // 🔴 URGENT : EPI expiré
        urgentItems.push({
          id: `epi-exp-${epi.id}`,
          title: `${itemName} — ${employeeName}`,
          subtitle: "⚠️ Échéance de renouvellement EPI dépassée",
          category: "epi",
          priority: "urgent",
          badgeText: "EPI Expiré",
          badgeVariant: "destructive",
          assignedTo: employeeName,
          dateLabel: `Échéance le ${formatDate(epi.renewal_due_at)}`,
          isOverdue: true,
          href: `/epi`,
        });
      } else if (renewalDate <= endOfMonth) {
        epiEcheanceMoisCount++;
        // 🟠 À TRAITER : EPI expirant ce mois
        aTraiterItems.push({
          id: `epi-month-${epi.id}`,
          title: `${itemName} — ${employeeName}`,
          subtitle: "⏳ Renouvellement / contrôle à prévoir ce mois",
          category: "epi",
          priority: "a_traiter",
          badgeText: "À renouveler ce mois",
          badgeVariant: "warning",
          assignedTo: employeeName,
          dateLabel: `Échéance le ${formatDate(epi.renewal_due_at)}`,
          href: `/epi`,
        });
      }
    }

    if (epi.status === "perdu_endommage" || epi.condition_state === "defectueux") {
      urgentItems.push({
        id: `epi-def-${epi.id}`,
        title: `${itemName} — ${employeeName}`,
        subtitle: "🔴 Équipement défectueux / endommagé à remplacer",
        category: "epi",
        priority: "urgent",
        badgeText: "Défectueux",
        badgeVariant: "destructive",
        assignedTo: employeeName,
        dateLabel: `Déclaré le ${formatDate(epi.assigned_at)}`,
        href: `/epi`,
      });
    }
  }

  const epiNecessitantAction = epiExpiresCount + epiDefectueuxCount + epiARenouvelerCount;

  // --- 5. CLASSIFICATION AUDITS & INSPECTIONS (Phase N) ---
  let auditsActifsCount = 0;
  let auditPointsNcCount = 0;
  let auditPointsNonEvaluesCount = 0;

  for (const item of auditItems) {
    if (item.status === "non_conforme") auditPointsNcCount++;
    if (item.status === "non_evalue") auditPointsNonEvaluesCount++;
  }

  // Preuves manquantes (points non conformes ou observations sans preuves rattachées)
  const itemsWithProofSet = new Set(auditProofLinks.map((pl) => pl.audit_item_id).filter(Boolean));
  const auditPreuvesManquantesCount = auditItems.filter(
    (i) => (i.status === "non_conforme" || i.status === "observation") && !itemsWithProofSet.has(i.id)
  ).length;

  for (const audit of audits) {
    if (audit.status === "en_cours" || audit.status === "en_preparation" || audit.status === "planifie") {
      auditsActifsCount++;
      const auditorName = audit.auditor ? (audit.auditor as unknown as { full_name: string }).full_name : null;
      aTraiterItems.push({
        id: `audit-${audit.id}`,
        title: audit.title,
        subtitle: audit.reference_framework || "Audit QHSE",
        category: "audit",
        priority: "a_traiter",
        badgeText: audit.status === "en_cours" ? "Audit en cours" : "Planifié",
        badgeVariant: audit.status === "en_cours" ? "warning" : "outline",
        assignedTo: auditorName,
        dateLabel: `Date : ${formatDate(audit.planned_date)}`,
        href: `/audits/${audit.id}`,
      });
    }
  }

  let inspectionEnCoursCount = 0;
  let inspectionNcCount = 0;
  let inspectionCompletedCount = 0;

  for (const insp of inspectionRuns) {
    if (insp.status === "en_cours") inspectionEnCoursCount++;
    if (insp.status === "completed") {
      inspectionCompletedCount++;
      if (insp.score_percentage !== null && insp.score_percentage < 80) {
        inspectionNcCount++;
      }
    }
  }

  // --- 6. CLASSIFICATION RISQUES CRITIQUES ---
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

  // --- 7. CLASSIFICATION ÉQUIPEMENTS À CONTRÔLER ---
  for (const eq of equipmentList) {
    if (eq.next_inspection_date) {
      const daysDiff = calculateDaysDifference(eq.next_inspection_date);
      if (daysDiff < 0) {
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

  // --- 8. CLASSIFICATION GED & DEVOIR DE RÉVISION (Phase L ISO 7.5) ---
  let gedEnRevisionCount = 0;
  let gedEcheanceRevueCount = 0;
  let gedExpiresCount = 0;
  const gedSignaturesEnAttenteCount = pendingDocumentSignatures.length;
  const gedAVerifierExterneCount = unverifiedRevisions.length;

  for (const doc of documents) {
    if (doc.status === "brouillon" || doc.status === "en_revision") {
      gedEnRevisionCount++;
      aTraiterItems.push({
        id: `doc-rev-${doc.id}`,
        title: `[GED ${doc.code_reference || ""}] ${doc.title}`,
        subtitle: "Document en cours d'élaboration / révision",
        category: "document",
        priority: "a_traiter",
        badgeText: "En révision",
        badgeVariant: "secondary",
        assignedTo: null,
        dateLabel: `Date d'effet : ${formatDate(doc.effective_date)}`,
        href: `/documents/${doc.id}`,
      });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Contrôle expiration document
    if (doc.expiry_date && doc.expiry_date < todayStr) {
      gedExpiresCount++;
      urgentItems.push({
        id: `doc-exp-over-${doc.id}`,
        title: `[GED ${doc.code_reference || ""}] ${doc.title}`,
        subtitle: "🔴 Document expiré — Action ou renouvellement requis",
        category: "document",
        priority: "urgent",
        badgeText: "Expiré",
        badgeVariant: "destructive",
        assignedTo: null,
        dateLabel: `Expiré le ${formatDate(doc.expiry_date)}`,
        isOverdue: true,
        href: `/documents/${doc.id}`,
      });
    }

    // Contrôle revue périodique
    const targetReview = doc.review_date;
    if (targetReview) {
      const reviewDate = new Date(targetReview);
      if (targetReview < todayStr) {
        gedEcheanceRevueCount++;
        urgentItems.push({
          id: `doc-rev-over-${doc.id}`,
          title: `[GED ${doc.code_reference || ""}] ${doc.title}`,
          subtitle: "Revue périodique documentaire en retard",
          category: "document",
          priority: "urgent",
          badgeText: "Revue en retard",
          badgeVariant: "destructive",
          assignedTo: null,
          dateLabel: `Prévue le ${formatDate(targetReview)}`,
          isOverdue: true,
          href: `/documents/${doc.id}`,
        });
      } else if (reviewDate <= in30Days) {
        gedEcheanceRevueCount++;
        aTraiterItems.push({
          id: `doc-rev-soon-${doc.id}`,
          title: `[GED ${doc.code_reference || ""}] ${doc.title}`,
          subtitle: "Document arrivant à échéance de revue périodique",
          category: "document",
          priority: "a_traiter",
          badgeText: "Revue à prévoir",
          badgeVariant: "warning",
          assignedTo: null,
          dateLabel: `Échéance le ${formatDate(targetReview)}`,
          href: `/documents/${doc.id}`,
        });
      }
    }
  }

  // Signalement des vérifications documents externes en attente
  if (gedAVerifierExterneCount > 0) {
    aTraiterItems.push({
      id: `doc-ext-verif-pending`,
      title: `${gedAVerifierExterneCount} révision(s) de document(s) externe(s) à vérifier`,
      subtitle: "Vérification requise pour validation d'origine externe (ISO 7.5)",
      category: "document",
      priority: "a_traiter",
      badgeText: "À vérifier",
      badgeVariant: "warning",
      assignedTo: null,
      dateLabel: `Action Qualité requise`,
      href: `/documents/registre?verification=a_verifier`,
    });
  }

  // Signalement des signatures documentaires en attente
  if (gedSignaturesEnAttenteCount > 0) {
    aTraiterItems.push({
      id: `doc-sig-pending`,
      title: `${gedSignaturesEnAttenteCount} signature(s) documentaires en attente`,
      subtitle: "Accusés et signatures requises sur documents GED en vigueur",
      category: "document",
      priority: "a_traiter",
      badgeText: "Signatures requises",
      badgeVariant: "warning",
      assignedTo: null,
      dateLabel: `En attente de traitement`,
      href: `/documents`,
    });
  }

  // CALCULS DÉTERMINISTES SANS FAUX SCORE DE CONFORMITÉ
  const tauxResolution = totalIncidents === 0 ? 0 : Math.round((incidentsResolusEtClotures / totalIncidents) * 100);

  const tauxEfficaciteCapaLabel =
    actionsEvalueesCount === 0
      ? "N/A — aucune donnée évaluée"
      : `${Math.round((actionsEfficacesCount / actionsEvalueesCount) * 100)} % (${actionsEfficacesCount}/${actionsEvalueesCount} évaluées)`;

  const tauxClotureCapaLabel =
    actions.length === 0
      ? "N/A — aucune action"
      : `${Math.round((actionsClotureesCount / actions.length) * 100)} % (${actionsClotureesCount}/${actions.length})`;

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
    permitsKpi: {
      total: permits.length,
      actifs: ptwActifs,
      suspendus: ptwSuspendus,
      enAttente: ptwEnAttente,
      expirantMoins2h: ptwExpirantMoins2h,
      necessitantAction: ptwNecessitantAction,
    },
    epiKpi: {
      total: epiAssignments.length,
      enService: epiEnServiceCount,
      expires: epiExpiresCount,
      defectueux: epiDefectueuxCount,
      aRenouveler: epiARenouvelerCount,
      echeanceMois: epiEcheanceMoisCount,
      necessitantAction: epiNecessitantAction,
    },
    capaKpi: {
      total: actions.length,
      ouvertes: actionsOuvertesCount,
      enCours: actionsEnCoursCount,
      bloquees: actionsBloqueesCount,
      enRetard: actionsEnRetardCount,
      aVerifier: actionsAVerifierCount,
      cloturees: actionsClotureesCount,
      tauxEfficaciteLabel: tauxEfficaciteCapaLabel,
      tauxClotureLabel: tauxClotureCapaLabel,
    },
    auditsKpi: {
      total: audits.length,
      actifs: auditsActifsCount,
      pointsNc: auditPointsNcCount,
      pointsNonEvalues: auditPointsNonEvaluesCount,
      preuvesManquantes: auditPreuvesManquantesCount,
    },
    inspectionsKpi: {
      total: inspectionRuns.length,
      enCours: inspectionEnCoursCount,
      nonConformes: inspectionNcCount,
      completedCount: inspectionCompletedCount,
    },
    gedKpi: {
      total: documents.length,
      enRevision: gedEnRevisionCount,
      echeanceRevue: gedEcheanceRevueCount,
      signaturesEnAttente: gedSignaturesEnAttenteCount,
      aVerifierExterne: gedAVerifierExterneCount,
      expires: gedExpiresCount,
    },
    risksKpi: {
      total: risks.length,
      critiques: risks.length,
    },
  };
}
