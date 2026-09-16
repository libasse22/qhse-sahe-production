"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/services/auth.service";
import type { WorkPermit, WorkPermitStatus, WorkPermitType, SafetyMeasure, WorkPermitTemplateSnapshot, WorkPermitSignature, WorkPermitWorker } from "@/lib/types/permits";
import { PERMIT_QUESTIONNAIRES, DEFAULT_EPI_LIST } from "@/lib/constants/permit-questionnaires";
import { getActiveTemplateForCompany } from "@/lib/services/permit-templates.service";
import type { EpiPermitComplianceResult, EpiWorkerComplianceItem } from "@/lib/types/epi";
import { listEpiAssignments } from "@/lib/services/epi.service";

const PERMIT_SELECT =
  "*, applicant:profiles!work_permits_applicant_id_fkey(full_name), approver:profiles!work_permits_approver_id_fkey(full_name), site:sites(name), equipment:equipment(name)";

interface PermitRow {
  id: string;
  reference: string;
  permit_type: WorkPermitType;
  title: string;
  description: string;
  location: string;
  contractor_company?: string | null;
  contractor_contact_name?: string | null;
  contractor_contact_phone?: string | null;
  decision?: string | null;
  site_id?: string | null;
  equipment_id?: string | null;
  equipment_ids?: string[] | null;
  applicant_id: string;
  approver_id?: string | null;
  start_time: string;
  end_time: string;
  safety_measures: SafetyMeasure[];
  status: WorkPermitStatus;
  rejection_reason?: string | null;
  suspended_at?: string | null;
  suspension_reason?: string | null;
  questionnaire_answers?: Record<string, any> | null;
  before_measures?: SafetyMeasure[] | null;
  during_measures?: SafetyMeasure[] | null;
  after_measures?: SafetyMeasure[] | null;
  epi_requirements?: string[] | null;
  emergency_plan?: Record<string, string> | null;
  template_id?: string | null;
  template_version_id?: string | null;
  template_snapshot?: WorkPermitTemplateSnapshot | null;
  custom_fields_data?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  applicant?: { full_name: string } | null;
  approver?: { full_name: string } | null;
  site?: { name: string } | null;
  equipment?: { name: string } | null;
}

function toWorkPermit(row: PermitRow): WorkPermit {
  const inferredDecision =
    row.decision === "AUTORISE" || row.decision === "NON_AUTORISE"
      ? (row.decision as "AUTORISE" | "NON_AUTORISE")
      : row.status === "approuve" || row.status === "en_cours" || row.status === "cloture"
      ? "AUTORISE"
      : row.status === "refuse"
      ? "NON_AUTORISE"
      : null;

  return {
    id: row.id,
    reference: row.reference,
    permitType: row.permit_type,
    title: row.title,
    description: row.description,
    location: row.location,
    contractorCompany: row.contractor_company ?? null,
    contractorContactName: row.contractor_contact_name ?? null,
    contractorContactPhone: row.contractor_contact_phone ?? null,
    decision: inferredDecision,
    siteId: row.site_id ?? null,
    siteName: row.site?.name ?? null,
    equipmentId: row.equipment_id ?? null,
    equipmentName: row.equipment?.name ?? null,
    equipmentIds: row.equipment_ids ?? [],
    applicantId: row.applicant_id,
    applicantName: row.applicant?.full_name ?? "—",
    approverId: row.approver_id ?? null,
    approverName: row.approver?.full_name ?? "—",
    startTime: row.start_time,
    endTime: row.end_time,
    safetyMeasures: row.safety_measures ?? [],
    status: row.status,
    rejectionReason: row.rejection_reason ?? null,
    suspendedAt: row.suspended_at ?? null,
    suspensionReason: row.suspension_reason ?? null,
    questionnaireAnswers: row.questionnaire_answers ?? {},
    beforeMeasures: row.before_measures ?? [],
    duringMeasures: row.during_measures ?? [],
    afterMeasures: row.after_measures ?? [],
    epiRequirements: row.epi_requirements ?? [],
    emergencyPlan: row.emergency_plan ?? {},
    templateId: row.template_id ?? null,
    templateVersionId: row.template_version_id ?? null,
    templateSnapshot: row.template_snapshot ?? null,
    customFieldsData: row.custom_fields_data ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listWorkPermits(): Promise<WorkPermit[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("work_permits")
    .select(PERMIT_SELECT)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as PermitRow[]).map(toWorkPermit);
}

export async function getWorkPermitById(id: string): Promise<WorkPermit | null> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("work_permits")
    .select(PERMIT_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return toWorkPermit(data as unknown as PermitRow);
}

async function checkUserPermission(supabase: any, permissionCode: string): Promise<boolean> {
  const { data: hasPerm, error } = await supabase.rpc("has_permission", {
    permission_code: permissionCode,
  });

  if (!error && typeof hasPerm === "boolean" && hasPerm) {
    return true;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "admin" || profile?.role === "manager_qhse") {
    return true;
  }

  return false;
}

async function getApproverUserIds(supabase: any, currentUserId: string): Promise<string[]> {
  const { data: activeProfiles } = await supabase
    .from("profiles")
    .select("id, role, role_id")
    .eq("status", "active")
    .neq("id", currentUserId);

  if (!activeProfiles || activeProfiles.length === 0) return [];

  const { data: perm } = await supabase
    .from("permissions")
    .select("id")
    .eq("code", "permits.approve")
    .maybeSingle();

  let roleIdsWithApprove: Set<string> = new Set();
  if (perm?.id) {
    const { data: rp } = await supabase
      .from("role_permissions")
      .select("role_id")
      .eq("permission_id", perm.id);
    if (rp) {
      roleIdsWithApprove = new Set(rp.map((r: any) => r.role_id).filter(Boolean));
    }
  }

  return activeProfiles
    .filter((p: any) => {
      if (p.role_id && roleIdsWithApprove.has(p.role_id)) {
        return true;
      }
      if (p.role === "admin" || p.role === "manager_qhse") {
        return true;
      }
      return false;
    })
    .map((p: any) => p.id);
}

export async function createWorkPermit(params: {
  title: string;
  permitType: WorkPermitType;
  description: string;
  location: string;
  contractorCompany?: string;
  contractorContactName?: string;
  contractorContactPhone?: string;
  siteId?: string;
  equipmentId?: string;
  equipmentIds?: string[];
  startTime: string;
  endTime: string;
  safetyMeasures: SafetyMeasure[];
  questionnaireAnswers?: Record<string, any>;
  beforeMeasures?: SafetyMeasure[];
  duringMeasures?: SafetyMeasure[];
  afterMeasures?: SafetyMeasure[];
  epiRequirements?: string[] | Record<string, boolean>;
  emergencyPlan?: Record<string, string>;
  templateId?: string;
  customFieldsData?: Record<string, any>;
}): Promise<ActionResult & { permitId?: string }> {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée. Reconnectez-vous." };

  const hasPerm = await checkUserPermission(supabase, "permits.create");
  if (!hasPerm) {
    return { error: "Permission insuffisante" };
  }

  // Fetch active template snapshot for company/template
  const templateInfo = await getActiveTemplateForCompany(params.templateId);
  const templateSnapshot = templateInfo.snapshot;
  const templateId = templateInfo.template?.id ?? (params.templateId || null);
  const templateVersionId = templateInfo.versionId;

  const startMs = new Date(params.startTime).getTime();
  const endMs = new Date(params.endTime).getTime();
  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
    return { error: "Les dates et heures de début et de fin sont invalides." };
  }
  const durationHours = (endMs - startMs) / (1000 * 60 * 60);
  const maxHours = templateSnapshot?.maxValidityHours || 8;
  if (durationHours > maxHours) {
    return {
      error: `Durée non conforme : la durée maximale autorisée pour ce référentiel est de ${maxHours} heures (durée demandée : ${durationHours.toFixed(1)}h).`,
    };
  }

  // Generation de reference industrielle transactionnelle (RPC XXX-HSE-NNN-REV00)
  let reference: string = "";
  try {
    const { data: refData } = await supabase.rpc("generate_work_permit_reference");
    if (refData && typeof refData === "string") {
      reference = refData;
    }
  } catch (e) {
    console.error("RPC generate_work_permit_reference error:", e);
  }

  if (!reference) {
    const refYear = new Date().getFullYear();
    const refRandom = Math.floor(1000 + Math.random() * 9000);
    reference = `PTW-${refYear}-${refRandom}`;
  }

  const { data, error } = await supabase
    .from("work_permits")
    .insert({
      reference,
      permit_type: params.permitType,
      title: params.title,
      description: params.description,
      location: params.location,
      contractor_company: params.contractorCompany || null,
      contractor_contact_name: params.contractorContactName || null,
      contractor_contact_phone: params.contractorContactPhone || null,
      site_id: params.siteId || null,
      equipment_id: params.equipmentId || null,
      equipment_ids: params.equipmentIds || [],
      applicant_id: user.id,
      start_time: params.startTime,
      end_time: params.endTime,
      safety_measures: params.safetyMeasures,
      questionnaire_answers: params.questionnaireAnswers || {},
      before_measures: params.beforeMeasures || templateSnapshot.beforeMeasures || [],
      during_measures: params.duringMeasures || templateSnapshot.duringMeasures || [],
      after_measures: params.afterMeasures || templateSnapshot.afterMeasures || [],
      epi_requirements: params.epiRequirements || [],
      emergency_plan: params.emergencyPlan || templateSnapshot.emergencyPlanConfig || {},
      template_id: templateId === "default" ? null : templateId,
      template_version_id: templateVersionId,
      template_snapshot: templateSnapshot,
      custom_fields_data: params.customFieldsData || {},
      status: "en_attente",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message || "Impossible de créer le permis de travail." };
  }

  // Initialize signature chain from template snapshot
  try {
    await initializePermitSignatures(data.id, templateSnapshot);
  } catch (err) {
    console.error("Error initializing permit signatures:", err);
  }

  // History logging
  try {
    if (user?.id && data?.id) {
      await supabase.from("work_permit_history").insert({
        permit_id: data.id,
        actor_id: user.id,
        event_type: "permit_created",
        new_status: "en_attente",
        comment: `Permis de travail créé et soumis pour validation (${reference})`,
      });
    }
  } catch {
    // Non-blocking history
  }

  // Notification Web Push non-bloquante pour les valideurs / approbateurs (permission permits.approve)
  try {
    const { sendWebPushToUser } = await import("@/lib/services/web-push.service");
    const approverIds = await getApproverUserIds(supabase, user.id);

    for (const approverId of approverIds) {
      void sendWebPushToUser(approverId, {
        title: "📄 Permis de travail à valider",
        body: `Titre : ${params.title} (${reference})`,
        url: `/permis-de-travail/${data.id}`,
        tag: `ptw-${data.id}`,
      });
    }
  } catch {
    // Non-blocking
  }

  revalidatePath("/permis-de-travail");
  revalidatePath("/dashboard");
  return { error: null, permitId: data.id };
}

function isQuestionnaireNonCompliant(
  permitType: WorkPermitType,
  questionnaireAnswers?: Record<string, any> | null,
  templateSnapshot?: WorkPermitTemplateSnapshot | null,
  customFieldsData?: Record<string, any> | null
): boolean {
  const questions =
    templateSnapshot?.questionnaires?.[permitType] ?? PERMIT_QUESTIONNAIRES[permitType] ?? [];

  const answers = questionnaireAnswers || {};

  // Standard questionnaire validation
  if (questions.length > 0) {
    if (Object.keys(answers).length === 0) {
      return true;
    }

    const standardNonCompliant = questions.some((q) => {
      const val = answers[q.id];
      const isMissing =
        val === undefined ||
        val === null ||
        (typeof val === "string" && val.trim() === "");

      if (q.critical && isMissing) {
        return true;
      }

      if (
        q.blockingValue &&
        val !== undefined &&
        val !== null &&
        val.toString().toLowerCase() === q.blockingValue.toLowerCase()
      ) {
        return true;
      }

      return false;
    });

    if (standardNonCompliant) return true;
  }

  // Custom sections & fields server-side validation
  if (templateSnapshot?.customSections && templateSnapshot.customSections.length > 0) {
    const customData = customFieldsData || {};

    for (const sec of templateSnapshot.customSections) {
      if (sec.active === false) continue;

      for (const field of sec.fields || []) {
        const val = customData[field.id];
        const isMissing =
          val === undefined ||
          val === null ||
          (typeof val === "string" && val.trim() === "") ||
          (Array.isArray(val) && val.length === 0);

        const isRequired = Boolean(field.required || sec.required);
        const isCritical = Boolean(field.critical);

        if ((isRequired || isCritical) && isMissing) {
          return true;
        }

        if (
          field.blockingValue &&
          val !== undefined &&
          val !== null &&
          val.toString().toLowerCase() === field.blockingValue.toLowerCase()
        ) {
          return true;
        }

        // Validate number type
        if (field.type === "number" && val !== undefined && val !== null && val !== "") {
          if (isNaN(Number(val))) return true;
        }

        // Validate select / multi-select options if configured
        if (
          (field.type === "select" || field.type === ("multi_select" as any) || field.type === ("multi-select" as any)) &&
          field.options &&
          field.options.length > 0 &&
          val !== undefined &&
          val !== null &&
          val !== ""
        ) {
          if (Array.isArray(val)) {
            if (val.some((v) => !field.options!.includes(v))) return true;
          } else {
            if (!field.options.includes(String(val))) return true;
          }
        }

        // Validate dynamic tables: row & column requirements
        if (field.type === "table") {
          if ((isRequired || isCritical) && (!Array.isArray(val) || val.length === 0)) {
            return true;
          }
          if (Array.isArray(val) && field.columns && field.columns.length > 0) {
            for (const row of val) {
              if (typeof row !== "object" || row === null) return true;
              for (const col of field.columns) {
                if (col.required) {
                  const colVal = row[col.id];
                  if (colVal === undefined || colVal === null || String(colVal).trim() === "") {
                    return true;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return false;
}

const ALLOWED_TRANSITIONS: Record<WorkPermitStatus, WorkPermitStatus[]> = {
  brouillon: ["en_attente", "annule"],
  en_attente: ["approuve", "refuse", "annule"],
  approuve: ["en_cours", "suspendu", "annule"],
  en_cours: ["suspendu", "cloture", "annule"],
  suspendu: ["en_cours", "annule"],
  refuse: ["en_attente"],
  cloture: [],
  annule: [],
};

export async function updateWorkPermitStatus(
  permitId: string,
  status: WorkPermitStatus,
  rejectionReason?: string,
): Promise<ActionResult> {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée. Reconnectez-vous." };

  // VÉRIFICATION DES PERMISSIONS UTILISATEUR
  let requiredPermission: string | null = null;
  if (status === "approuve" || status === "refuse") {
    requiredPermission = "permits.approve";
  } else if (status === "suspendu") {
    requiredPermission = "permits.suspend";
  } else if (status === "cloture" || status === "annule") {
    requiredPermission = "permits.close";
  }

  if (requiredPermission) {
    const hasPerm = await checkUserPermission(supabase, requiredPermission);
    if (!hasPerm) {
      return { error: "Permission insuffisante" };
    }
  }

  const { data: currentPermit } = await supabase
    .from("work_permits")
    .select("applicant_id, reference, title, status, permit_type, questionnaire_answers, template_snapshot, custom_fields_data")
    .eq("id", permitId)
    .single();

  if (!currentPermit) {
    return { error: "Permis de travail introuvable." };
  }

  const oldStatus = currentPermit.status as WorkPermitStatus;

  // VÉRIFICATION MACHINE À ÉTATS
  const allowed = ALLOWED_TRANSITIONS[oldStatus] || [];
  if (!allowed.includes(status)) {
    return {
      error: `Transition non autorisée : ${oldStatus} → ${status}`,
    };
  }

  // CONTRÔLE SERVEUR DES POINTS BLOQUANTS CRITIQUES (SECTION 2)
  if (status === "approuve" || status === "en_cours") {
    if (currentPermit.permit_type) {
      if (
        isQuestionnaireNonCompliant(
          currentPermit.permit_type as WorkPermitType,
          currentPermit.questionnaire_answers,
          currentPermit.template_snapshot,
          currentPermit.custom_fields_data
        )
      ) {
        return {
          error:
            "Impossible d'approuver : le questionnaire ou les sections spécifiques contiennent des éléments bloquants ou non conformes.",
        };
      }
    }
  }

  // CONTRÔLE SERVEUR DE LA CHAÎNE DE SIGNATURES OBLIGATOIRES (SECTION APPROBATION)
  if (status === "approuve") {
    const signatures = await listWorkPermitSignatures(permitId);
    if (signatures.length > 0) {
      const pendingOrRefused = signatures.filter((s) => s.status !== "signed");
      if (pendingOrRefused.length > 0) {
        const refused = signatures.filter((s) => s.status === "refused");
        if (refused.length > 0) {
          return {
            error: "Approbation impossible : une ou plusieurs signatures obligatoires de la chaîne ont été refusées.",
          };
        }
        return {
          error: `Approbation impossible : ${pendingOrRefused.length} signature(s) sur ${signatures.length} demeurent en attente de validation dans la chaîne.`,
        };
      }
    }
  }

  // CONTRÔLE SERVEUR DES ACCUSÉS DE RÉCEPTION DES INTERVENANTS (SECTION DÉMARRAGE EN_COURS)
  if (status === "en_cours") {
    const workers = await listWorkPermitWorkers(permitId);
    if (workers.length > 0) {
      const unacknowledged = workers.filter((w) => w.acknowledgementStatus !== "acknowledged");
      if (unacknowledged.length > 0) {
        const refused = workers.filter((w) => w.acknowledgementStatus === "refused");
        if (refused.length > 0) {
          return {
            error: "Démarrage impossible : un ou plusieurs intervenants ont refusé l'émargement / prise de connaissance du permis.",
          };
        }
        return {
          error: `Démarrage de l'intervention impossible : ${unacknowledged.length} intervenant(s) sur ${workers.length} n'ont pas encore accusé réception du permis.`,
        };
      }
    }

    // CONTRÔLE SERVEUR EXIGENCES EPI SUR LES INTERVENANTS (PHASE J)
    const epiCheck = await checkPermitEpiCompliance(permitId);
    if (!epiCheck.isCompliant && epiCheck.hasEpiRequirements) {
      return {
        error: `Démarrage bloqué : ${epiCheck.summary}`,
      };
    }
  }

  const updateData: Record<string, any> = { status, updated_at: new Date().toISOString() };

  if (status === "approuve") {
    updateData.approver_id = user?.id;
    updateData.decision = "AUTORISE";
  }
  if (status === "refuse") {
    if (!rejectionReason || !rejectionReason.trim()) {
      return { error: "Un motif de refus est obligatoire pour refuser un permis de travail." };
    }
    updateData.decision = "NON_AUTORISE";
    updateData.rejection_reason = rejectionReason;
  } else if (rejectionReason) {
    updateData.rejection_reason = rejectionReason;
  }

  const { error } = await supabase
    .from("work_permits")
    .update(updateData)
    .eq("id", permitId);

  if (error) {
    return { error: "Impossible de mettre à jour le permis de travail." };
  }

  // Record audit history event
  if (user?.id) {
    try {
      await supabase.from("work_permit_history").insert({
        permit_id: permitId,
        actor_id: user.id,
        event_type: `status_change_to_${status}`,
        old_status: oldStatus,
        new_status: status,
        comment: rejectionReason || `Statut passé de ${oldStatus || 'inconnu'} à ${status}`,
      });
    } catch {
      // Non-blocking
    }
  }

  // Notification Web Push au demandeur du permis
  if (currentPermit && (currentPermit as any).applicant_id) {
    try {
      const { sendWebPushToUser } = await import("@/lib/services/web-push.service");
      const statusLabel = status === "approuve" ? "Approuvé" : status === "refuse" ? "Refusé" : "Mis à jour";
      void sendWebPushToUser((currentPermit as any).applicant_id, {
        title: `📄 Permis de travail : ${statusLabel}`,
        body: `Référence : ${(currentPermit as any).reference} — ${(currentPermit as any).title}`,
        url: `/permis-de-travail/${permitId}`,
        tag: `ptw-status-${permitId}`,
      });
    } catch {
      // Non-blocking
    }
  }

  revalidatePath(`/permis-de-travail/${permitId}`);
  revalidatePath("/permis-de-travail");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function suspendWorkPermit(permitId: string, reason: string): Promise<ActionResult> {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée. Reconnectez-vous." };

  const hasPerm = await checkUserPermission(supabase, "permits.suspend");
  if (!hasPerm) {
    return { error: "Permission insuffisante" };
  }

  const { data: currentPermit } = await supabase
    .from("work_permits")
    .select("status")
    .eq("id", permitId)
    .single();

  const oldStatus = currentPermit?.status as WorkPermitStatus | undefined;

  const { error } = await supabase
    .from("work_permits")
    .update({
      status: "suspendu",
      suspended_at: new Date().toISOString(),
      suspension_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", permitId);

  if (error) return { error: "Impossible de suspendre le permis." };

  if (user?.id) {
    try {
      await supabase.from("work_permit_history").insert({
        permit_id: permitId,
        actor_id: user.id,
        event_type: "suspended",
        old_status: oldStatus,
        new_status: "suspendu",
        comment: reason,
      });
    } catch {
      // Non-blocking
    }
  }

  revalidatePath(`/permis-de-travail/${permitId}`);
  revalidatePath("/permis-de-travail");
  return { error: null };
}

export async function resumeWorkPermit(permitId: string, comment?: string): Promise<ActionResult> {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée. Reconnectez-vous." };

  const hasPerm = await checkUserPermission(supabase, "permits.suspend");
  if (!hasPerm) {
    return { error: "Permission insuffisante" };
  }

  const { data: currentPermit } = await supabase
    .from("work_permits")
    .select("status, permit_type, questionnaire_answers, template_snapshot, custom_fields_data")
    .eq("id", permitId)
    .single();

  if (!currentPermit) {
    return { error: "Permis introuvable." };
  }

  const oldStatus = currentPermit.status as WorkPermitStatus;

  // CONTRÔLE SERVEUR AVANT LEVÉE DE SUSPENSION
  if (currentPermit.permit_type) {
    if (
      isQuestionnaireNonCompliant(
        currentPermit.permit_type as WorkPermitType,
        currentPermit.questionnaire_answers,
        currentPermit.template_snapshot,
        currentPermit.custom_fields_data
      )
    ) {
      return {
        error:
          "Impossible d'approuver : le questionnaire ou les sections spécifiques contiennent des éléments bloquants ou non conformes.",
      };
    }
  }

  const { error } = await supabase
    .from("work_permits")
    .update({
      status: "en_cours",
      updated_at: new Date().toISOString(),
    })
    .eq("id", permitId);

  if (error) return { error: "Impossible de lever la suspension du permis." };

  if (user?.id) {
    try {
      await supabase.from("work_permit_history").insert({
        permit_id: permitId,
        actor_id: user.id,
        event_type: "resumed",
        old_status: oldStatus,
        new_status: "en_cours",
        comment: comment || "Intervention reprise après levée des conditions de suspension.",
      });
    } catch {
      // Non-blocking
    }
  }

  revalidatePath(`/permis-de-travail/${permitId}`);
  revalidatePath("/permis-de-travail");
  return { error: null };
}

export async function cancelWorkPermit(permitId: string, reason: string): Promise<ActionResult> {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentPermit } = await supabase
    .from("work_permits")
    .select("status")
    .eq("id", permitId)
    .single();

  const oldStatus = currentPermit?.status as WorkPermitStatus | undefined;

  const { error } = await supabase
    .from("work_permits")
    .update({
      status: "annule",
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", permitId);

  if (error) return { error: "Impossible d'annuler définitivement le permis." };

  if (user?.id) {
    try {
      await supabase.from("work_permit_history").insert({
        permit_id: permitId,
        actor_id: user.id,
        event_type: "cancelled",
        old_status: oldStatus,
        new_status: "annule",
        comment: reason,
      });
    } catch {
      // Non-blocking
    }
  }

  revalidatePath(`/permis-de-travail/${permitId}`);
  revalidatePath("/permis-de-travail");
  return { error: null };
}

export async function listWorkPermitWorkers(permitId: string): Promise<WorkPermitWorker[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("work_permit_workers")
    .select("*")
    .eq("work_permit_id", permitId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as any[]).map((w) => ({
    id: w.id,
    workPermitId: w.work_permit_id,
    workerId: w.worker_id ?? null,
    workerName: w.worker_name,
    roleOrQualification: w.role_or_qualification ?? "",
    acknowledgementStatus: w.acknowledgement_status ?? "acknowledged", // default 'acknowledged' for legacy
    acknowledgedAt: w.acknowledged_at ?? null,
    acknowledgementMethod: w.acknowledgement_method ?? "digital",
    rejectionReason: w.rejection_reason ?? null,
    createdAt: w.created_at,
  }));
}

export async function addWorkPermitWorker(params: {
  permitId: string;
  workerName: string;
  roleOrQualification: string;
}): Promise<ActionResult> {
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("work_permit_workers").insert({
    work_permit_id: params.permitId,
    worker_name: params.workerName,
    role_or_qualification: params.roleOrQualification,
    acknowledgement_status: "pending",
  });

  if (error) return { error: "Impossible d'ajouter l'intervenant." };

  revalidatePath(`/permis-de-travail/${params.permitId}`);
  return { error: null };
}

export async function deleteWorkPermitWorker(workerId: string, permitId: string): Promise<ActionResult> {
  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from("work_permit_workers")
    .delete()
    .eq("id", workerId);

  if (error) return { error: "Impossible de retirer l'intervenant." };

  revalidatePath(`/permis-de-travail/${permitId}`);
  return { error: null };
}

export async function listWorkPermitHistory(permitId: string) {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("work_permit_history")
    .select("*, actor:profiles!work_permit_history_actor_id_fkey(full_name)")
    .eq("permit_id", permitId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as any[]).map((h) => ({
    id: h.id,
    companyId: h.company_id,
    permitId: h.permit_id,
    actorId: h.actor_id,
    actorName: h.actor?.full_name ?? "Système / Utilisateur",
    eventType: h.event_type,
    oldStatus: h.old_status,
    newStatus: h.new_status,
    details: h.details,
    comment: h.comment,
    createdAt: h.created_at,
  }));
}

// ============================================================================
// SIGNATURES & ACCUSÉS INDIVIDUELS PTW (PHASE I)
// ============================================================================

const DEFAULT_SIGNATURE_ROLES: { code: string; label: string; order: number }[] = [
  { code: "EXECUTOR", label: "1. Responsable Exécutant / Demande", order: 1 },
  { code: "PREVENTION", label: "2. Conseiller / Responsable Prévention HSE", order: 2 },
  { code: "WORKPLACE_MANAGER", label: "3. Responsable du Lieu de Travail", order: 3 },
  { code: "AUTHORIZER", label: "4. Approbateur / Responsable Autorisant", order: 4 },
];

export async function initializePermitSignatures(
  permitId: string,
  templateSnapshot?: WorkPermitTemplateSnapshot | null
): Promise<void> {
  const supabase = (await createClient()) as any;
  const { data: existing } = await supabase
    .from("work_permit_signatures")
    .select("id")
    .eq("work_permit_id", permitId);

  if (existing && existing.length > 0) return;

  const chain = templateSnapshot?.signatureChain;
  let rolesToInsert: { roleCode: string; signerRoleLabel: string; stepOrder: number }[] = [];

  if (chain && Array.isArray(chain) && chain.length > 0) {
    rolesToInsert = chain.map((rCode, idx) => {
      const match = DEFAULT_SIGNATURE_ROLES.find((d) => d.code === rCode);
      return {
        roleCode: rCode,
        signerRoleLabel: match ? match.label : `Signataire (${rCode})`,
        stepOrder: idx + 1,
      };
    });
  } else {
    rolesToInsert = DEFAULT_SIGNATURE_ROLES.map((d) => ({
      roleCode: d.code,
      signerRoleLabel: d.label,
      stepOrder: d.order,
    }));
  }

  const rows = rolesToInsert.map((r) => ({
    work_permit_id: permitId,
    role_code: r.roleCode,
    signer_name: "En attente d'affectation",
    signer_role_label: r.signerRoleLabel,
    status: "pending",
    step_order: r.stepOrder,
  }));

  await supabase.from("work_permit_signatures").insert(rows);
}

export async function listWorkPermitSignatures(permitId: string): Promise<WorkPermitSignature[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("work_permit_signatures")
    .select("*, signer:profiles!work_permit_signatures_signer_id_fkey(full_name)")
    .eq("work_permit_id", permitId)
    .order("step_order", { ascending: true });

  if (error || !data) return [];
  return (data as any[]).map((s) => ({
    id: s.id,
    companyId: s.company_id,
    workPermitId: s.work_permit_id,
    roleCode: s.role_code,
    signerId: s.signer_id ?? null,
    signerName: s.signer?.full_name || s.signer_name,
    signerRoleLabel: s.signer_role_label ?? "",
    status: s.status,
    rejectionReason: s.rejection_reason ?? null,
    signatureMode: s.signature_mode ?? "digital",
    signatureStoragePath: s.signature_storage_path ?? null,
    signedAt: s.signed_at ?? null,
    signedIp: s.signed_ip ?? null,
    stepOrder: s.step_order,
    createdAt: s.created_at,
  }));
}

export async function signWorkPermitSignature(params: {
  signatureId: string;
  permitId: string;
  signatureStoragePath?: string;
}): Promise<ActionResult> {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée. Reconnectez-vous." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: sig } = await supabase
    .from("work_permit_signatures")
    .select("*")
    .eq("id", params.signatureId)
    .single();

  if (!sig) return { error: "Demande de signature introuvable." };
  if (sig.status === "signed") return { error: "Cette étape a déjà été signée." };

  const signerName = profile?.full_name || user.email || "Utilisateur";

  const { error } = await supabase
    .from("work_permit_signatures")
    .update({
      signer_id: user.id,
      signer_name: signerName,
      status: "signed",
      signed_at: new Date().toISOString(),
      signature_storage_path: params.signatureStoragePath || null,
    })
    .eq("id", params.signatureId);

  if (error) return { error: "Impossible d'enregistrer la signature." };

  try {
    await supabase.from("work_permit_history").insert({
      permit_id: params.permitId,
      actor_id: user.id,
      event_type: "signature_signed",
      comment: `Signature validée pour le rôle : ${sig.signer_role_label || sig.role_code} par ${signerName}`,
      details: { signature_id: params.signatureId, role_code: sig.role_code },
    });
  } catch {}

  revalidatePath(`/permis-de-travail/${params.permitId}`);
  return { error: null };
}

export async function refuseWorkPermitSignature(params: {
  signatureId: string;
  permitId: string;
  reason: string;
}): Promise<ActionResult> {
  if (!params.reason || !params.reason.trim()) {
    return { error: "Le motif du refus de signature est obligatoire." };
  }

  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée. Reconnectez-vous." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: sig } = await supabase
    .from("work_permit_signatures")
    .select("*")
    .eq("id", params.signatureId)
    .single();

  if (!sig) return { error: "Demande de signature introuvable." };

  const signerName = profile?.full_name || user.email || "Utilisateur";

  const { error } = await supabase
    .from("work_permit_signatures")
    .update({
      signer_id: user.id,
      signer_name: signerName,
      status: "refused",
      rejection_reason: params.reason,
      signed_at: new Date().toISOString(),
    })
    .eq("id", params.signatureId);

  if (error) return { error: "Impossible d'enregistrer le refus de signature." };

  try {
    await supabase.from("work_permit_history").insert({
      permit_id: params.permitId,
      actor_id: user.id,
      event_type: "signature_refused",
      comment: `Signature refusée par ${signerName} (${sig.signer_role_label || sig.role_code}) : ${params.reason}`,
      details: { signature_id: params.signatureId, role_code: sig.role_code, reason: params.reason },
    });
  } catch {}

  revalidatePath(`/permis-de-travail/${params.permitId}`);
  return { error: null };
}

export async function acknowledgeWorkPermitWorker(params: {
  workerRecordId: string;
  permitId: string;
}): Promise<ActionResult> {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée. Reconnectez-vous." };

  const { data: worker } = await supabase
    .from("work_permit_workers")
    .select("*")
    .eq("id", params.workerRecordId)
    .single();

  if (!worker) return { error: "Fiche intervenant introuvable." };

  const { error } = await supabase
    .from("work_permit_workers")
    .update({
      worker_id: user.id,
      acknowledgement_status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
      acknowledgement_method: "digital",
    })
    .eq("id", params.workerRecordId);

  if (error) return { error: "Impossible d'enregistrer l'émargement." };

  try {
    await supabase.from("work_permit_history").insert({
      permit_id: params.permitId,
      actor_id: user.id,
      event_type: "worker_acknowledged",
      comment: `Accusé de réception / émargement validé par l'intervenant : ${worker.worker_name}`,
      details: { worker_record_id: params.workerRecordId },
    });
  } catch {}

  revalidatePath(`/permis-de-travail/${params.permitId}`);
  return { error: null };
}

export async function refuseWorkPermitWorkerAcknowledgement(params: {
  workerRecordId: string;
  permitId: string;
  reason: string;
}): Promise<ActionResult> {
  if (!params.reason || !params.reason.trim()) {
    return { error: "Le motif du refus de prise de connaissance est obligatoire." };
  }

  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée. Reconnectez-vous." };

  const { data: worker } = await supabase
    .from("work_permit_workers")
    .select("*")
    .eq("id", params.workerRecordId)
    .single();

  if (!worker) return { error: "Fiche intervenant introuvable." };

  const { error } = await supabase
    .from("work_permit_workers")
    .update({
      worker_id: user.id,
      acknowledgement_status: "refused",
      rejection_reason: params.reason,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", params.workerRecordId);

  if (error) return { error: "Impossible d'enregistrer le refus d'émargement." };

  try {
    await supabase.from("work_permit_history").insert({
      permit_id: params.permitId,
      actor_id: user.id,
      event_type: "worker_acknowledgement_refused",
      comment: `Émargement refusé par l'intervenant ${worker.worker_name} : ${params.reason}`,
      details: { worker_record_id: params.workerRecordId, reason: params.reason },
    });
  } catch {}

  revalidatePath(`/permis-de-travail/${params.permitId}`);
  return { error: null };
}

export async function checkPermitEpiCompliance(permitId: string): Promise<EpiPermitComplianceResult> {
  const permit = await getWorkPermitById(permitId);
  if (!permit) {
    return {
      permitId,
      isCompliant: false,
      totalRequired: 0,
      totalCompliant: 0,
      hasEpiRequirements: false,
      status: "NON_CONFORME",
      summary: "Permis introuvable",
      items: [],
      missingCount: 0,
      expiredCount: 0,
      defectiveCount: 0,
    };
  }

  const rawEpi = permit.epiRequirements;
  const selectedEpiIds: string[] = Array.isArray(rawEpi)
    ? rawEpi
    : typeof rawEpi === "object" && rawEpi !== null
    ? Object.entries(rawEpi)
        .filter(([, checked]) => Boolean(checked))
        .map(([key]) => key)
    : [];

  const catalogEpiList = permit.templateSnapshot?.epiList || DEFAULT_EPI_LIST;
  const requiredEpis = catalogEpiList.filter((e) => selectedEpiIds.includes(e.id));

  if (requiredEpis.length === 0) {
    return {
      permitId,
      isCompliant: true,
      totalRequired: 0,
      totalCompliant: 0,
      hasEpiRequirements: false,
      status: "NA",
      summary: "Aucune exigence EPI spécifique sur ce permis",
      items: [],
      missingCount: 0,
      expiredCount: 0,
      defectiveCount: 0,
    };
  }

  const workers = await listWorkPermitWorkers(permitId);
  if (workers.length === 0) {
    return {
      permitId,
      isCompliant: false,
      totalRequired: requiredEpis.length,
      totalCompliant: 0,
      hasEpiRequirements: true,
      status: "PENDING_WORKERS",
      summary: "Aucun intervenant rattaché au permis pour contrôler les EPI requis",
      items: [],
      missingCount: requiredEpis.length,
      expiredCount: 0,
      defectiveCount: 0,
    };
  }

  const allAssignments = await listEpiAssignments();
  const items: EpiWorkerComplianceItem[] = [];
  let missingCount = 0;
  let expiredCount = 0;
  let defectiveCount = 0;
  let totalCompliant = 0;
  const totalRequiredCount = workers.length * requiredEpis.length;
  const now = new Date();

  for (const worker of workers) {
    const workerAssignments = allAssignments.filter(
      (a) =>
        (worker.workerId && a.recipientId === worker.workerId) ||
        (a.recipientName && a.recipientName.trim().toLowerCase() === worker.workerName.trim().toLowerCase())
    );

    for (const reqEpi of requiredEpis) {
      const matchingAssignment = workerAssignments.find((a) => {
        if (!a.category && !a.catalogName) return false;
        const catMatch = a.category?.toLowerCase() === reqEpi.id.toLowerCase();
        const nameMatch =
          a.catalogName?.toLowerCase().includes(reqEpi.label.toLowerCase()) ||
          reqEpi.label.toLowerCase().includes(a.catalogName?.toLowerCase() || "");
        return catMatch || nameMatch;
      });

      if (!matchingAssignment) {
        missingCount++;
        items.push({
          workerId: worker.workerId,
          workerName: worker.workerName,
          requiredEpiId: reqEpi.id,
          requiredEpiLabel: reqEpi.label,
          status: "manquant",
          message: `EPI '${reqEpi.label}' non attribué à cet intervenant`,
        });
        continue;
      }

      const isDefective = matchingAssignment.conditionState === "defectueux" || matchingAssignment.status === "perdu_endommage";
      const isExpired =
        matchingAssignment.status === "a_renouveler" ||
        (matchingAssignment.renewalDueAt && new Date(matchingAssignment.renewalDueAt).getTime() < now.getTime());

      if (isDefective) {
        defectiveCount++;
        items.push({
          workerId: worker.workerId,
          workerName: worker.workerName,
          requiredEpiId: reqEpi.id,
          requiredEpiLabel: reqEpi.label,
          status: "non_conforme",
          assignmentId: matchingAssignment.id,
          assignmentStatus: matchingAssignment.status,
          conditionState: matchingAssignment.conditionState,
          renewalDueAt: matchingAssignment.renewalDueAt,
          message: `EPI défectueux ou perdu (${matchingAssignment.conditionState})`,
        });
      } else if (isExpired) {
        expiredCount++;
        items.push({
          workerId: worker.workerId,
          workerName: worker.workerName,
          requiredEpiId: reqEpi.id,
          requiredEpiLabel: reqEpi.label,
          status: "expire",
          assignmentId: matchingAssignment.id,
          assignmentStatus: matchingAssignment.status,
          conditionState: matchingAssignment.conditionState,
          renewalDueAt: matchingAssignment.renewalDueAt,
          message: `Date d'échéance dépassée (${matchingAssignment.renewalDueAt ? new Date(matchingAssignment.renewalDueAt).toLocaleDateString() : 'Expiré'})`,
        });
      } else {
        totalCompliant++;
        items.push({
          workerId: worker.workerId,
          workerName: worker.workerName,
          requiredEpiId: reqEpi.id,
          requiredEpiLabel: reqEpi.label,
          status: "conforme",
          assignmentId: matchingAssignment.id,
          assignmentStatus: matchingAssignment.status,
          conditionState: matchingAssignment.conditionState,
          renewalDueAt: matchingAssignment.renewalDueAt,
          message: `EPI conforme en service`,
        });
      }
    }
  }

  const isCompliant = missingCount === 0 && expiredCount === 0 && defectiveCount === 0;
  const status = isCompliant ? "CONFORME" : "NON_CONFORME";
  const nonCompliantWorkerCount = new Set(
    items.filter((i) => i.status !== "conforme").map((i) => i.workerName)
  ).size;

  const summary = isCompliant
    ? `Tous les EPI requis (${totalCompliant}/${totalRequiredCount}) sont conformes et valides.`
    : `${nonCompliantWorkerCount} intervenant(s) ne satisfont pas les exigences EPI (${missingCount} manquant(s), ${expiredCount} expiré(s), ${defectiveCount} non conforme(s)).`;

  return {
    permitId,
    isCompliant,
    totalRequired: totalRequiredCount,
    totalCompliant,
    hasEpiRequirements: true,
    status,
    summary,
    items,
    missingCount,
    expiredCount,
    defectiveCount,
  };
}
