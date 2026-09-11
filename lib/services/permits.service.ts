"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/services/auth.service";
import type { WorkPermit, WorkPermitStatus, WorkPermitType, SafetyMeasure } from "@/lib/types/permits";

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
  site_id?: string | null;
  equipment_id?: string | null;
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
  created_at: string;
  updated_at: string;
  applicant?: { full_name: string } | null;
  approver?: { full_name: string } | null;
  site?: { name: string } | null;
  equipment?: { name: string } | null;
}

function toWorkPermit(row: PermitRow): WorkPermit {
  return {
    id: row.id,
    reference: row.reference,
    permitType: row.permit_type,
    title: row.title,
    description: row.description,
    location: row.location,
    contractorCompany: row.contractor_company ?? null,
    siteId: row.site_id ?? null,
    siteName: row.site?.name ?? null,
    equipmentId: row.equipment_id ?? null,
    equipmentName: row.equipment?.name ?? null,
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

export async function createWorkPermit(params: {
  title: string;
  permitType: WorkPermitType;
  description: string;
  location: string;
  contractorCompany?: string;
  siteId?: string;
  equipmentId?: string;
  startTime: string;
  endTime: string;
  safetyMeasures: SafetyMeasure[];
  questionnaireAnswers?: Record<string, any>;
  beforeMeasures?: SafetyMeasure[];
  duringMeasures?: SafetyMeasure[];
  afterMeasures?: SafetyMeasure[];
  epiRequirements?: string[] | Record<string, boolean>;
  emergencyPlan?: Record<string, string>;
}): Promise<ActionResult & { permitId?: string }> {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée. Reconnectez-vous." };

  const refYear = new Date().getFullYear();
  const refRandom = Math.floor(1000 + Math.random() * 9000);
  const reference = `PTW-${refYear}-${refRandom}`;

  const { data, error } = await supabase
    .from("work_permits")
    .insert({
      reference,
      permit_type: params.permitType,
      title: params.title,
      description: params.description,
      location: params.location,
      contractor_company: params.contractorCompany || null,
      site_id: params.siteId || null,
      equipment_id: params.equipmentId || null,
      applicant_id: user.id,
      start_time: params.startTime,
      end_time: params.endTime,
      safety_measures: params.safetyMeasures,
      questionnaire_answers: params.questionnaireAnswers || {},
      before_measures: params.beforeMeasures || [],
      during_measures: params.duringMeasures || [],
      after_measures: params.afterMeasures || [],
      epi_requirements: params.epiRequirements || [],
      emergency_plan: params.emergencyPlan || {},
      status: "en_attente",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message || "Impossible de créer le permis de travail." };
  }

  // History logging
  try {
    if (user?.id && data?.id) {
      await supabase.from("work_permit_history").insert({
        permit_id: data.id,
        actor_id: user.id,
        event_type: "creation",
        new_status: "en_attente",
        comment: `Permis de travail créé et soumis pour validation (${reference})`,
      });
    }
  } catch {
    // Non-blocking history
  }

  // Notification Web Push non-bloquante pour les managers / valideurs
  try {
    const { sendWebPushToUser } = await import("@/lib/services/web-push.service");
    const { data: qhseUsers } = await supabase
      .from("profiles")
      .select("id")
      .eq("status", "active")
      .neq("id", user.id);

    if (qhseUsers) {
      for (const q of qhseUsers as any[]) {
        void sendWebPushToUser(q.id, {
          title: "📄 Permis de travail à valider",
          body: `Titre : ${params.title} (${reference})`,
          url: `/permis-de-travail/${data.id}`,
          tag: `ptw-${data.id}`,
        });
      }
    }
  } catch {
    // Non-blocking
  }

  revalidatePath("/permis-de-travail");
  revalidatePath("/dashboard");
  return { error: null, permitId: data.id };
}

export async function updateWorkPermitStatus(
  permitId: string,
  status: WorkPermitStatus,
  rejectionReason?: string,
): Promise<ActionResult> {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentPermit } = await supabase
    .from("work_permits")
    .select("applicant_id, reference, title, status, permit_type, questionnaire_answers")
    .eq("id", permitId)
    .single();

  if (!currentPermit) {
    return { error: "Permis de travail introuvable." };
  }

  const oldStatus = currentPermit.status as WorkPermitStatus;

  // CONTRÔLE SERVEUR DES POINTS BLOQUANTS CRITIQUES (SECTION 2)
  if (status === "approuve" || status === "en_cours") {
    if (currentPermit.permit_type && currentPermit.questionnaire_answers) {
      const { PERMIT_QUESTIONNAIRES } = await import("@/lib/constants/permit-questionnaires");
      const questions = PERMIT_QUESTIONNAIRES[currentPermit.permit_type as WorkPermitType] || [];
      const answers = currentPermit.questionnaire_answers as Record<string, any>;

      const blockingQuestions = questions.filter((q) => {
        if (!q.blockingValue) return false;
        const ans = answers[q.id];
        return ans && ans.toString().toLowerCase() === q.blockingValue.toLowerCase();
      });

      if (blockingQuestions.length > 0) {
        return {
          error: `🔴 BLOQUANT : Impossible d'autoriser ce permis. ${blockingQuestions.length} point(s) de sécurité critique(s) non conforme(s) : ${blockingQuestions.map((q) => q.label).join("; ")}.`,
        };
      }
    }
  }

  const updateData: Record<string, any> = { status, updated_at: new Date().toISOString() };

  if (status === "approuve") {
    updateData.approver_id = user?.id;
  }
  if (rejectionReason) {
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

  const { data: currentPermit } = await supabase
    .from("work_permits")
    .select("status, permit_type, questionnaire_answers")
    .eq("id", permitId)
    .single();

  if (!currentPermit) {
    return { error: "Permis introuvable." };
  }

  const oldStatus = currentPermit.status as WorkPermitStatus;

  // CONTRÔLE SERVEUR AVANT LEVÉE DE SUSPENSION
  if (currentPermit.permit_type && currentPermit.questionnaire_answers) {
    const { PERMIT_QUESTIONNAIRES } = await import("@/lib/constants/permit-questionnaires");
    const questions = PERMIT_QUESTIONNAIRES[currentPermit.permit_type as WorkPermitType] || [];
    const answers = currentPermit.questionnaire_answers as Record<string, any>;

    const blockingQuestions = questions.filter((q) => {
      if (!q.blockingValue) return false;
      const ans = answers[q.id];
      return ans && ans.toString().toLowerCase() === q.blockingValue.toLowerCase();
    });

    if (blockingQuestions.length > 0) {
      return {
        error: `🔴 BLOQUANT : Le permis contient encore des non-conformités critiques : ${blockingQuestions.map((q) => q.label).join("; ")}.`,
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

export async function listWorkPermitWorkers(permitId: string) {
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
