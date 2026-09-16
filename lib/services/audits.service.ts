"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { auditSchema, findingSchema } from "@/lib/validation/audit.schema";
import type { ActionResult } from "@/lib/services/auth.service";
import type {
  Audit,
  AuditFinding,
  AuditStatus,
  AuditItem,
  AuditItemStatus,
  AuditProofLink,
  AuditProofType,
  AuditHistoryEvent,
  FindingType,
} from "@/lib/types/audit";
import { createAction } from "@/lib/services/actions.service";

const AUDIT_SELECT = `
  *,
  auditor:profiles!audits_auditor_id_fkey(full_name),
  site:sites(name)
`;

interface AuditRow {
  id: string;
  title: string;
  scope: string;
  criteria: string;
  auditor_id: string;
  planned_date: string;
  start_date?: string | null;
  end_date?: string | null;
  site_id?: string | null;
  reference_framework?: string | null;
  status: AuditStatus;
  company_id?: string;
  created_at: string;
  auditor: { full_name: string } | null;
  site: { name: string } | null;
}

function toAudit(row: AuditRow): Audit {
  return {
    id: row.id,
    title: row.title,
    scope: row.scope,
    criteria: row.criteria,
    auditorId: row.auditor_id,
    auditorName: row.auditor?.full_name || "—",
    plannedDate: row.planned_date,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    siteId: row.site_id ?? null,
    siteName: row.site?.name ?? null,
    referenceFramework: row.reference_framework || "Système de Management QHSE - Référentiel Interne",
    status: row.status,
    companyId: row.company_id,
    createdAt: row.created_at,
  };
}

/** Inscription inaltérable dans le journal append-only audit_history */
export async function logAuditHistory(params: {
  auditId: string;
  eventType: AuditHistoryEvent["eventType"];
  comment?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Récupère le nom du profil
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    await supabase.from("audit_history").insert({
      audit_id: params.auditId,
      actor_id: user.id,
      actor_name: profile?.full_name || "Utilisateur",
      event_type: params.eventType,
      comment: params.comment || "",
      details: params.details || {},
    });
  } catch {
    // Ignoré si échec secondaire de traçabilité
  }
}

export async function listAudits(): Promise<Audit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audits")
    .select(AUDIT_SELECT)
    .order("planned_date", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as AuditRow[]).map(toAudit);
}

export async function getAuditById(id: string): Promise<Audit | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audits")
    .select(AUDIT_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return toAudit(data as unknown as AuditRow);
}

export async function createAudit(formData: FormData): Promise<ActionResult> {
  const parsed = auditSchema.safeParse({
    title: formData.get("title"),
    scope: formData.get("scope"),
    criteria: formData.get("criteria"),
    auditorId: formData.get("auditorId"),
    plannedDate: formData.get("plannedDate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { title, scope, criteria, auditorId, plannedDate } = parsed.data;
  const startDate = (formData.get("startDate") as string) || null;
  const endDate = (formData.get("endDate") as string) || null;
  const siteId = (formData.get("siteId") as string) || null;
  const referenceFramework = (formData.get("referenceFramework") as string) || "Système de Management QHSE - ISO 9001/45001/14001";
  const initialStatus = (formData.get("status") as AuditStatus) || "brouillon";

  const { data, error } = await supabase
    .from("audits")
    .insert({
      title,
      scope,
      criteria,
      auditor_id: auditorId,
      planned_date: plannedDate,
      start_date: startDate,
      end_date: endDate,
      site_id: siteId,
      reference_framework: referenceFramework,
      status: initialStatus,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Impossible de créer l'audit." };

  await logAuditHistory({
    auditId: data.id,
    eventType: "audit_created",
    comment: `Création de l'audit QHSE : ${title}`,
    details: { scope, referenceFramework },
  });

  revalidatePath("/audits");
  redirect(`/audits/${data.id}`);
}

export async function updateAuditStatus(id: string, status: AuditStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("audits").update({ status }).eq("id", id);
  if (error) return { error: "Impossible de mettre à jour le statut." };

  await logAuditHistory({
    auditId: id,
    eventType: status === "cloture" ? "audit_closed" : "status_updated",
    comment: `Changement de statut vers : ${status}`,
    details: { newStatus: status },
  });

  revalidatePath(`/audits/${id}`);
  revalidatePath("/audits");
  return { error: null };
}

/* ============================================================================
 * POINTS D'AUDIT / CHECKLIST
 * ============================================================================ */

export async function getAuditItems(auditId: string): Promise<AuditItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_items")
    .select("*, proof_links:audit_proof_links(*)")
    .eq("audit_id", auditId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    companyId: row.company_id,
    auditId: row.audit_id,
    title: row.title,
    requirement: row.requirement || "",
    category: row.category || "maitrise_operationnelle",
    status: (row.status as AuditItemStatus) || "non_evalue",
    comment: row.comment || "",
    capaActionId: row.capa_action_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    proofLinks: (row.proof_links || []).map((pl: any) => ({
      id: pl.id,
      companyId: pl.company_id,
      auditId: pl.audit_id,
      auditItemId: pl.audit_item_id,
      proofType: pl.proof_type as AuditProofType,
      targetId: pl.target_id,
      title: pl.title,
      metadata: pl.metadata || {},
      createdAt: pl.created_at,
    })),
  }));
}

export async function addAuditItem(auditId: string, formData: FormData): Promise<ActionResult> {
  const title = (formData.get("title") as string)?.trim();
  const requirement = (formData.get("requirement") as string)?.trim() || "";
  const category = (formData.get("category") as string) || "maitrise_operationnelle";

  if (!title || title.length < 3) {
    return { error: "Un titre de point d'audit d'au moins 3 caractères est requis." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_items")
    .insert({
      audit_id: auditId,
      title,
      requirement,
      category,
      status: "non_evalue",
      comment: "",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Impossible d'ajouter ce point d'audit." };
  }

  await logAuditHistory({
    auditId,
    eventType: "item_added",
    comment: `Ajout du point d'audit : ${title}`,
    details: { itemId: data.id, requirement },
  });

  revalidatePath(`/audits/${auditId}`);
  return { error: null };
}

export async function updateAuditItemStatus(
  itemId: string,
  auditId: string,
  status: AuditItemStatus,
  comment?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("audit_items")
    .update({
      status,
      comment: comment ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  if (error) {
    return { error: "Impossible de mettre à jour l'évaluation du point." };
  }

  await logAuditHistory({
    auditId,
    eventType: "item_status_updated",
    comment: `Point mis à jour [${status}] : ${comment || ""}`,
    details: { itemId, status },
  });

  revalidatePath(`/audits/${auditId}`);
  return { error: null };
}

export async function deleteAuditItem(itemId: string, auditId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("audit_items").delete().eq("id", itemId);

  if (error) return { error: "Impossible de supprimer ce point." };

  revalidatePath(`/audits/${auditId}`);
  return { error: null };
}

/* ============================================================================
 * "MONTREZ-MOI LA PREUVE" (LIAISONS 360°)
 * ============================================================================ */

export async function linkProofToItem(
  auditId: string,
  auditItemId: string | null,
  proofType: AuditProofType,
  targetId: string,
  title: string,
  metadata: Record<string, unknown> = {}
): Promise<ActionResult> {
  const supabase = await createClient();

  // Dédoublonnage : vérifier si déjà lié
  const { data: existing } = await supabase
    .from("audit_proof_links")
    .select("id")
    .eq("audit_id", auditId)
    .eq("proof_type", proofType)
    .eq("target_id", targetId)
    .maybeSingle();

  if (existing) {
    return { error: "Cette preuve est déjà rattachée à cet audit." };
  }

  const { error } = await supabase.from("audit_proof_links").insert({
    audit_id: auditId,
    audit_item_id: auditItemId || null,
    proof_type: proofType,
    targetId: targetId,
    title,
    metadata,
  });

  if (error) {
    return { error: "Impossible de rattacher la preuve." };
  }

  await logAuditHistory({
    auditId,
    eventType: "proof_linked",
    comment: `Rattachement preuve [${proofType}] : ${title}`,
    details: { proofType, targetId, auditItemId },
  });

  revalidatePath(`/audits/${auditId}`);
  return { error: null };
}

export async function unlinkProof(proofLinkId: string, auditId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("audit_proof_links").delete().eq("id", proofLinkId);

  if (error) return { error: "Impossible de retirer la preuve." };

  await logAuditHistory({
    auditId,
    eventType: "proof_unlinked",
    comment: "Retrait d'une preuve rattachée",
    details: { proofLinkId },
  });

  revalidatePath(`/audits/${auditId}`);
  return { error: null };
}

export async function getAuditProofLinks(auditId: string): Promise<AuditProofLink[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_proof_links")
    .select("*")
    .eq("audit_id", auditId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((pl: any) => ({
    id: pl.id,
    companyId: pl.company_id,
    auditId: pl.audit_id,
    auditItemId: pl.audit_item_id,
    proofType: pl.proof_type as AuditProofType,
    targetId: pl.target_id,
    title: pl.title,
    metadata: pl.metadata || {},
    createdAt: pl.created_at,
  }));
}

export interface ProofCandidate {
  id: string;
  type: AuditProofType;
  title: string;
  subtitle?: string;
}

/** Liste l'ensemble des candidats de preuves disponibles dans les briques existantes */
export async function listAvailableProofCandidates(): Promise<ProofCandidate[]> {
  const supabase = await createClient();
  const candidates: ProofCandidate[] = [];

  // 1. Documents GED
  const { data: docs } = await supabase
    .from("documents")
    .select("id, code_reference, title, status")
    .order("created_at", { ascending: false })
    .limit(20);
  if (docs) {
    docs.forEach((d) => {
      candidates.push({
        id: d.id,
        type: "ged_document",
        title: `[GED ${d.code_reference || ""}] ${d.title}`,
        subtitle: `Statut GED: ${d.status}`,
      });
    });
  }

  // 2. Incidents
  const { data: incs } = await supabase
    .from("incidents")
    .select("id, code_reference, title, severity")
    .order("created_at", { ascending: false })
    .limit(20);
  if (incs) {
    incs.forEach((i) => {
      candidates.push({
        id: i.id,
        type: "incident",
        title: `[Incident ${i.code_reference || ""}] ${i.title}`,
        subtitle: `Grave : ${i.severity}`,
      });
    });
  }

  // 3. Inspections
  const { data: insps } = await supabase
    .from("inspection_runs")
    .select("id, title, status")
    .order("created_at", { ascending: false })
    .limit(20);
  if (insps) {
    insps.forEach((i) => {
      candidates.push({
        id: i.id,
        type: "inspection",
        title: `[Inspection] ${i.title}`,
        subtitle: `Statut : ${i.status}`,
      });
    });
  }

  // 4. Permis de travail PtW
  const { data: ptws } = await supabase
    .from("work_permits")
    .select("id, permit_number, title, status")
    .order("created_at", { ascending: false })
    .limit(20);
  if (ptws) {
    ptws.forEach((p) => {
      candidates.push({
        id: p.id,
        type: "work_permit",
        title: `[Permis ${p.permit_number || ""}] ${p.title}`,
        subtitle: `Statut PtW : ${p.status}`,
      });
    });
  }

  // 5. Actions CAPA
  const { data: capas } = await supabase
    .from("actions_correctives")
    .select("id, code_reference, description, status")
    .order("created_at", { ascending: false })
    .limit(20);
  if (capas) {
    capas.forEach((c) => {
      candidates.push({
        id: c.id,
        type: "capa_action",
        title: `[CAPA ${c.code_reference || ""}] ${c.description}`,
        subtitle: `Statut : ${c.status}`,
      });
    });
  }

  // 6. Preuves de situation / Terrain
  const { data: sps } = await supabase
    .from("situation_proofs")
    .select("id, title, media_type")
    .order("created_at", { ascending: false })
    .limit(20);
  if (sps) {
    sps.forEach((s) => {
      candidates.push({
        id: s.id,
        type: "situation_proof",
        title: `[Preuve terrain] ${s.title}`,
        subtitle: `Média : ${s.media_type}`,
      });
    });
  }

  return candidates;
}

/** Inspection 360° d'une preuve rattachée depuis le système source SANS duplication de fichier. */
export async function getProof360Details(proof: AuditProofLink): Promise<Record<string, unknown> | null> {
  const supabase = await createClient();

  switch (proof.proofType) {
    case "ged_document": {
      // Récupère le document avec sa révision active, ses signatures et son historique
      const { data: doc } = await supabase
        .from("documents")
        .select(`
          id, code_reference, title, status, effective_date, created_at,
          current_revision:document_revisions!documents_current_revision_id_fkey(
            id, version_label, version_number, storage_path, created_at, status
          )
        `)
        .eq("id", proof.targetId)
        .single();

      if (!doc) return null;

      // Récupère les signatures associées
      const { data: sigs } = await supabase
        .from("document_signatures")
        .select("id, signer_name, signed_at, role")
        .eq("document_id", proof.targetId);

      return {
        type: "ged_document",
        id: doc.id,
        codeReference: doc.code_reference,
        title: doc.title,
        status: doc.status,
        effectiveDate: doc.effective_date,
        activeRevision: doc.current_revision,
        signatures: sigs || [],
        sourceUrl: `/ged/${doc.id}`,
      };
    }

    case "incident": {
      const { data: inc } = await supabase
        .from("incidents")
        .select("id, code_reference, title, status, severity, incident_date, location")
        .eq("id", proof.targetId)
        .single();

      if (!inc) return null;

      return {
        type: "incident",
        id: inc.id,
        codeReference: inc.code_reference,
        title: inc.title,
        status: inc.status,
        severity: inc.severity,
        date: inc.incident_date,
        location: inc.location,
        sourceUrl: `/incidents/${inc.id}`,
      };
    }

    case "inspection": {
      const { data: insp } = await supabase
        .from("inspection_runs")
        .select("id, title, status, score_percentage, completed_at, inspector_name")
        .eq("id", proof.targetId)
        .single();

      if (!insp) return null;

      return {
        type: "inspection",
        id: insp.id,
        title: insp.title,
        status: insp.status,
        scorePercentage: insp.score_percentage,
        completedAt: insp.completed_at,
        inspectorName: insp.inspector_name,
        sourceUrl: `/inspections/${insp.id}`,
      };
    }

    case "capa_action": {
      const { data: capa } = await supabase
        .from("actions_correctives")
        .select("id, code_reference, description, status, priorite, echeance, responsable:profiles!actions_correctives_responsable_id_fkey(full_name)")
        .eq("id", proof.targetId)
        .single();

      if (!capa) return null;

      return {
        type: "capa_action",
        id: capa.id,
        codeReference: capa.code_reference,
        title: capa.description,
        status: capa.status,
        priority: capa.priorite,
        echeance: capa.echeance,
        responsableName: (capa as any).responsable?.full_name || "—",
        sourceUrl: `/actions`,
      };
    }

    case "work_permit": {
      const { data: ptw } = await supabase
        .from("work_permits")
        .select("id, permit_number, title, status, start_time, end_time, location")
        .eq("id", proof.targetId)
        .single();

      if (!ptw) return null;

      return {
        type: "work_permit",
        id: ptw.id,
        permitNumber: ptw.permit_number,
        title: ptw.title,
        status: ptw.status,
        startTime: ptw.start_time,
        endTime: ptw.end_time,
        location: ptw.location,
        sourceUrl: `/permis-de-travail/${ptw.id}`,
      };
    }

    case "epi_assignment": {
      const { data: epi } = await supabase
        .from("epi_assignments")
        .select("id, status, assigned_at, renewal_due_at, catalog_item:epi_catalog(name), employee:profiles!epi_assignments_employee_id_fkey(full_name)")
        .eq("id", proof.targetId)
        .single();

      if (!epi) return null;

      return {
        type: "epi_assignment",
        id: epi.id,
        title: (epi as any).catalog_item?.name || "Équipement EPI",
        employeeName: (epi as any).employee?.full_name || "Employé",
        status: epi.status,
        assignedAt: epi.assigned_at,
        renewalDueAt: epi.renewal_due_at,
        sourceUrl: `/epi`,
      };
    }

    case "situation_proof": {
      const { data: sp } = await supabase
        .from("situation_proofs")
        .select("id, title, storage_path, media_type, created_at")
        .eq("id", proof.targetId)
        .single();

      if (!sp) return null;

      return {
        type: "situation_proof",
        id: sp.id,
        title: sp.title,
        mediaType: sp.media_type,
        createdAt: sp.created_at,
        storagePath: sp.storage_path,
        sourceUrl: sp.storage_path,
      };
    }

    case "qhse_report": {
      const { data: rep } = await supabase
        .from("qhse_reports")
        .select("id, title, report_type, period_start, period_end, generated_at")
        .eq("id", proof.targetId)
        .single();

      if (!rep) return null;

      return {
        type: "qhse_report",
        id: rep.id,
        title: rep.title,
        reportType: rep.report_type,
        periodStart: rep.period_start,
        periodEnd: rep.period_end,
        generatedAt: rep.generated_at,
        sourceUrl: `/reporting`,
      };
    }

    default:
      return null;
  }
}

/* ============================================================================
 * CRÉATION CAPA DIRECTE DEPUIS UN POINT D'AUDIT
 * ============================================================================ */

export async function createCapaFromAuditItem(
  auditItemId: string,
  auditId: string,
  formData: FormData
): Promise<ActionResult & { actionId?: string }> {
  // 1. Création de l'action corrective avec source auditId
  const res = await createAction({ auditId }, formData);

  if (res.error || !res.actionId) {
    return { error: res.error || "Impossible de créer la CAPA depuis le point d'audit." };
  }

  // 2. Mise à jour de audit_items (lien capa_action_id & statut non_conforme si pas déjà)
  const supabase = await createClient();
  await supabase
    .from("audit_items")
    .update({
      capa_action_id: res.actionId,
      status: "non_conforme",
    })
    .eq("id", auditItemId);

  // 3. Traçabilité
  await logAuditHistory({
    auditId,
    eventType: "capa_created",
    comment: `CAPA générée pour le point d'audit : ${formData.get("description")}`,
    details: { auditItemId, actionId: res.actionId },
  });

  revalidatePath(`/audits/${auditId}`);
  return { error: null, actionId: res.actionId };
}

/* ============================================================================
 * JOURNAL D'HISTORIQUE APPEND-ONLY & SYNTHÈSE AUDITEUR
 * ============================================================================ */

export async function listAuditHistory(auditId: string): Promise<AuditHistoryEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_history")
    .select("*")
    .eq("audit_id", auditId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((h: any) => ({
    id: h.id,
    companyId: h.company_id,
    auditId: h.audit_id,
    actorId: h.actor_id,
    actorName: h.actor_name || "Utilisateur",
    eventType: h.event_type,
    comment: h.comment,
    details: h.details,
    createdAt: h.created_at,
  }));
}

/** Calculs déterministes pour la Synthèse Auditeur */
export async function getAuditSummaryMetrics(auditId: string) {
  const items = await getAuditItems(auditId);
  const proofLinks = await getAuditProofLinks(auditId);

  const totalItems = items.length;
  const me = items.filter((i) => i.status === "conforme").length;
  const nc = items.filter((i) => i.status === "non_conforme").length;
  const obs = items.filter((i) => i.status === "observation").length;
  const na = items.filter((i) => i.status === "non_applicable").length;
  const ne = items.filter((i) => i.status === "non_evalue").length;

  const evaluatedCount = totalItems - na - ne;

  // Calcul strict sans faux 100%
  let complianceRateLabel = "N/A — aucun point évalué";
  let compliancePercentage = 0;

  if (evaluatedCount > 0) {
    compliancePercentage = Math.round((me / evaluatedCount) * 100);
    complianceRateLabel = `${compliancePercentage} % (${me} / ${evaluatedCount} évalués)`;
  }

  // Preuves manquantes (points non conformes ou observations sans preuves liées)
  const itemsWithoutProofs = items.filter(
    (i) => i.status !== "non_applicable" && (!i.proofLinks || i.proofLinks.length === 0)
  ).length;

  // CAPA générées
  const capasGenerated = items.filter((i) => !!i.capaActionId).length;

  return {
    totalItems,
    me,
    nc,
    obs,
    na,
    ne,
    evaluatedCount,
    compliancePercentage,
    complianceRateLabel,
    totalProofsLinked: proofLinks.length,
    itemsWithoutProofs,
    capasGenerated,
  };
}

/* ============================================================================
 * CONSTATS (RETRO-COMPATIBILITÉ)
 * ============================================================================ */

function toFinding(row: {
  id: string;
  audit_id: string;
  type: FindingType;
  description: string;
  action_id: string | null;
  created_at: string;
}): AuditFinding {
  return {
    id: row.id,
    auditId: row.audit_id,
    type: row.type,
    description: row.description,
    actionId: row.action_id,
    createdAt: row.created_at,
  };
}

export async function listFindings(auditId: string): Promise<AuditFinding[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_findings")
    .select("*")
    .eq("audit_id", auditId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(toFinding);
}

export async function addFinding(auditId: string, formData: FormData): Promise<ActionResult> {
  const parsed = findingSchema.safeParse({
    type: formData.get("type"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { type, description } = parsed.data;
  const { error } = await supabase
    .from("audit_findings")
    .insert({ audit_id: auditId, type, description, created_by: user.id });

  if (error) return { error: "Impossible d'ajouter ce constat." };

  revalidatePath(`/audits/${auditId}`);
  return { error: null };
}
