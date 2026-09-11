"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  actionSchema,
  actionBlockSchema,
  actionVerificationSchema,
  actionCommentSchema,
  type ActionBlockInput,
  type ActionVerificationInput,
} from "@/lib/validation/action.schema";
import type { ActionResult } from "@/lib/services/auth.service";
import type {
  ActionCorrective,
  ActionStatus,
  ActionComment,
  ActionHistoryEvent,
  CapaActionType,
  QhseDomain,
  ActionPriority,
  CapaEfficiencyStatus,
  ActionBlockCategory,
} from "@/lib/types/actions";

const ACTION_SELECT = `
  *,
  incident:incidents(title),
  audit:audits(title),
  risk:risks(title),
  inspection_run:inspection_runs(title),
  work_permit:work_permits(title),
  responsable:profiles!actions_correctives_responsable_id_fkey(full_name),
  verificateur:profiles!actions_correctives_verificateur_id_fkey(full_name),
  blocked_by_profile:profiles!actions_correctives_blocked_by_fkey(full_name),
  cloture_par_profile:profiles!actions_correctives_cloture_par_fkey(full_name)
`;

interface ActionRow {
  id: string;
  code_reference?: string | null;
  type_action?: CapaActionType | null;
  domaine_qhse?: QhseDomain | null;
  priorite?: ActionPriority | null;
  incident_id?: string | null;
  audit_id?: string | null;
  risk_id?: string | null;
  inspection_run_id?: string | null;
  inspection_item_id?: string | null;
  work_permit_id?: string | null;
  parent_action_id?: string | null;
  description: string;
  responsable_id: string;
  echeance: string;
  echeance_initiale?: string | null;
  extension_count?: number | null;
  status: ActionStatus;
  is_blocked?: boolean | null;
  blocked_at?: string | null;
  blocked_reason_category?: ActionBlockCategory | null;
  blocked_reason_detail?: string | null;
  blocked_by?: string | null;
  unblocked_at?: string | null;
  cause_immediate?: string | null;
  cause_racine?: string | null;
  methode_analyse?: string | null;
  analyse_5_pourquoi?: string[] | null;
  efficacite_statut?: CapaEfficiencyStatus | null;
  date_verification?: string | null;
  verificateur_id?: string | null;
  commentaire_efficacite?: string | null;
  motif_rejet?: string | null;
  cloture_at?: string | null;
  cloture_par?: string | null;
  created_at: string;
  updated_at: string;
  incident?: { title: string } | null;
  audit?: { title: string } | null;
  risk?: { title: string } | null;
  inspection_run?: { title: string } | null;
  work_permit?: { title: string } | null;
  responsable?: { full_name: string } | null;
  verificateur?: { full_name: string } | null;
  blocked_by_profile?: { full_name: string } | null;
  cloture_par_profile?: { full_name: string } | null;
}

function toAction(row: ActionRow): ActionCorrective {
  let sourceType: ActionCorrective["sourceType"] = "autre";
  let sourceTitle = "Action directe / autonome";

  if (row.incident_id && row.incident?.title) {
    sourceType = "incident";
    sourceTitle = `Incident : ${row.incident.title}`;
  } else if (row.inspection_run_id && row.inspection_run?.title) {
    sourceType = "inspection";
    sourceTitle = `Inspection : ${row.inspection_run.title}`;
  } else if (row.audit_id && row.audit?.title) {
    sourceType = "audit";
    sourceTitle = `Audit : ${row.audit.title}`;
  } else if (row.risk_id && row.risk?.title) {
    sourceType = "risk";
    sourceTitle = `Risque : ${row.risk.title}`;
  } else if (row.work_permit_id && row.work_permit?.title) {
    sourceType = "permis";
    sourceTitle = `Permis : ${row.work_permit.title}`;
  }

  // Normalisation du statut pour rétro-compatibilité
  let status: ActionStatus = row.status;
  if ((status as string) === "a_faire") status = "ouverte";
  if ((status as string) === "termine") status = "cloturee";

  return {
    id: row.id,
    codeReference: row.code_reference || `ACT-${row.id.slice(0, 6)}`,
    typeAction: row.type_action || "corrective",
    domaineQhse: row.domaine_qhse || "securite",
    priorite: row.priorite || "moyenne",
    incidentId: row.incident_id ?? null,
    incidentTitle: row.incident?.title ?? null,
    auditId: row.audit_id ?? null,
    auditTitle: row.audit?.title ?? null,
    riskId: row.risk_id ?? null,
    riskTitle: row.risk?.title ?? null,
    inspectionRunId: row.inspection_run_id ?? null,
    inspectionItemId: row.inspection_item_id ?? null,
    workPermitId: row.work_permit_id ?? null,
    workPermitTitle: row.work_permit?.title ?? null,
    parentActionId: row.parent_action_id ?? null,
    sourceType,
    sourceTitle,
    description: row.description,
    responsableId: row.responsable_id,
    responsableName: row.responsable?.full_name || "—",
    echeance: row.echeance,
    echeanceInitiale: row.echeance_initiale || row.echeance,
    extensionCount: row.extension_count || 0,
    status,
    isBlocked: !!row.is_blocked,
    blockedAt: row.blocked_at ?? null,
    blockedReasonCategory: row.blocked_reason_category ?? null,
    blockedReasonDetail: row.blocked_reason_detail ?? null,
    blockedByName: row.blocked_by_profile?.full_name ?? null,
    unblockedAt: row.unblocked_at ?? null,
    causeImmediate: row.cause_immediate ?? null,
    causeRacine: row.cause_racine ?? null,
    methodeAnalyse: row.methode_analyse ?? null,
    analyse5Pourquoi: Array.isArray(row.analyse_5_pourquoi) ? row.analyse_5_pourquoi : [],
    efficaciteStatut: row.efficacite_statut || "non_evalue",
    dateVerification: row.date_verification ?? null,
    verificateurId: row.verificateur_id ?? null,
    verificateurName: row.verificateur?.full_name ?? null,
    commentaireEfficacite: row.commentaire_efficacite ?? null,
    motifRejet: row.motif_rejet ?? null,
    clotureAt: row.cloture_at ?? null,
    clotureParName: row.cloture_par_profile?.full_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Enregistre un événement immuable dans l'audit log technique action_history. */
export async function logActionHistoryEvent(params: {
  actionId: string;
  eventType: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  comment?: string | null;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("action_history").insert({
      action_id: params.actionId,
      actor_id: user.id,
      event_type: params.eventType,
      old_data: params.oldData ?? null,
      new_data: params.newData ?? null,
      comment: params.comment ?? null,
    } as never);
  } catch {
    // Ignoré si échec secondaire d'audit log pour ne pas bloquer l'action métier
  }
}

/** Liste toutes les actions visibles pour l'utilisateur. */
export async function listMyActions(): Promise<ActionCorrective[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("actions_correctives")
    .select(ACTION_SELECT)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as ActionRow[]).map(toAction);
}

export async function getActionById(actionId: string): Promise<ActionCorrective | null> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("actions_correctives")
    .select(ACTION_SELECT)
    .eq("id", actionId)
    .single();

  if (error || !data) return null;
  return toAction(data as unknown as ActionRow);
}

export async function listActionsForIncident(incidentId: string): Promise<ActionCorrective[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("actions_correctives")
    .select(ACTION_SELECT)
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as ActionRow[]).map(toAction);
}

export async function listActionsForInspectionRun(inspectionRunId: string): Promise<ActionCorrective[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("actions_correctives")
    .select(ACTION_SELECT)
    .eq("inspection_run_id", inspectionRunId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as ActionRow[]).map(toAction);
}

export async function listActionsForAudit(auditId: string): Promise<ActionCorrective[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("actions_correctives")
    .select(ACTION_SELECT)
    .eq("audit_id", auditId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as ActionRow[]).map(toAction);
}

export async function listActionsForRisk(riskId: string): Promise<ActionCorrective[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("actions_correctives")
    .select(ACTION_SELECT)
    .eq("risk_id", riskId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as ActionRow[]).map(toAction);
}

export async function listActionsForWorkPermit(workPermitId: string): Promise<ActionCorrective[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("actions_correctives")
    .select(ACTION_SELECT)
    .eq("work_permit_id", workPermitId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as ActionRow[]).map(toAction);
}

/** Création d'une action CAPA enrichie. */
export async function createAction(
  source: {
    incidentId?: string;
    inspectionRunId?: string;
    auditId?: string;
    riskId?: string;
    workPermitId?: string;
    parentActionId?: string;
  },
  formData: FormData,
): Promise<ActionResult & { actionId?: string }> {
  const parsed = actionSchema.safeParse({
    description: formData.get("description"),
    responsableId: formData.get("responsableId"),
    echeance: formData.get("echeance"),
    typeAction: formData.get("typeAction") || "corrective",
    domaineQhse: formData.get("domaineQhse") || "securite",
    priorite: formData.get("priorite") || "moyenne",
    causeImmediate: formData.get("causeImmediate") || undefined,
    causeRacine: formData.get("causeRacine") || undefined,
    methodeAnalyse: formData.get("methodeAnalyse") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const supabase = (await createClient()) as any;
  const {
    description,
    responsableId,
    echeance,
    typeAction,
    domaineQhse,
    priorite,
    causeImmediate,
    causeRacine,
    methodeAnalyse,
  } = parsed.data;

  const { data: newRow, error } = await supabase
    .from("actions_correctives")
    .insert({
      incident_id: source.incidentId || null,
      inspection_run_id: source.inspectionRunId || null,
      audit_id: source.auditId || null,
      risk_id: source.riskId || null,
      work_permit_id: source.workPermitId || null,
      parent_action_id: source.parentActionId || null,
      description,
      responsable_id: responsableId,
      echeance,
      echeance_initiale: echeance,
      type_action: typeAction,
      domaine_qhse: domaineQhse,
      priorite,
      cause_immediate: causeImmediate || null,
      cause_racine: causeRacine || null,
      methode_analyse: methodeAnalyse || null,
      status: "ouverte",
    } as never)
    .select("id, code_reference")
    .single();

  if (error || !newRow) {
    return { error: "Impossible de créer l'action CAPA." };
  }

  // Traçabilité immuable
  await logActionHistoryEvent({
    actionId: newRow.id,
    eventType: "creation",
    newData: {
      description,
      responsableId,
      echeance,
      typeAction,
      domaineQhse,
      priorite,
      codeReference: newRow.code_reference,
    },
    comment: "Création initiale de l'action CAPA",
  });

  // Web Push non-bloquant
  if (responsableId) {
    try {
      const { sendWebPushToUser } = await import("@/lib/services/web-push.service");
      void sendWebPushToUser(responsableId, {
        title: `🛠️ CAPA ${newRow.code_reference || ""} assignée`,
        body: description.slice(0, 100),
        url: "/actions",
        tag: `capa-${newRow.id}`,
      });
    } catch {
      // Ignoré
    }
  }

  if (source.incidentId) revalidatePath(`/incidents/${source.incidentId}`);
  if (source.auditId) revalidatePath(`/audits/${source.auditId}`);
  if (source.inspectionRunId) revalidatePath(`/inspections/${source.inspectionRunId}`);
  if (source.workPermitId) revalidatePath(`/permis-de-travail/${source.workPermitId}`);
  revalidatePath("/actions");
  revalidatePath("/dashboard");
  return { error: null, actionId: newRow.id };
}

/** Mise à jour du statut avec contrôles métier stricts et traçabilité immuable. */
export async function updateActionStatus(
  actionId: string,
  incidentId: string | null | undefined,
  targetStatus: ActionStatus,
  motif?: string,
): Promise<ActionResult> {
  const supabase = (await createClient()) as any;
  const currentAction = await getActionById(actionId);

  if (!currentAction) {
    return { error: "Action introuvable." };
  }

  // Contrôle de verrouillage des actions clôturées/rejetées
  if (
    (currentAction.status === "cloturee" || currentAction.status === "rejetee") &&
    targetStatus !== "reouverte" &&
    targetStatus !== "en_cours"
  ) {
    return { error: "Cette action est clôturée ou rejetée. Elle doit d'abord être réouverte officiellement." };
  }

  // Contrôle strict de la preuve recevable avant le passage à "a_verifier"
  if (targetStatus === "a_verifier") {
    const { count, error: proofErr } = await supabase
      .from("situation_proofs")
      .select("id", { count: "exact", head: true })
      .eq("action_id", actionId);

    if (proofErr || !count || count === 0) {
      return {
        error:
          "Au moins une preuve recevable (photo, vidéo, document) doit être ajoutée avant de transmettre l'action pour vérification.",
      };
    }
  }

  // Contrôle du motif obligatoire pour rejet ou réouverture
  if ((targetStatus === "rejetee" || targetStatus === "reouverte") && (!motif || motif.trim().length < 5)) {
    return { error: "Un motif explicite d'au moins 5 caractères est requis." };
  }

  const updatePayload: Record<string, unknown> = {
    status: targetStatus === "reouverte" ? "en_cours" : targetStatus,
  };

  if (targetStatus === "rejetee") {
    updatePayload.motif_rejet = motif;
  }

  const { error } = await supabase.from("actions_correctives").update(updatePayload).eq("id", actionId);

  if (error) {
    return { error: "Impossible de mettre à jour cette action." };
  }

  // Journal d'audit
  const eventType =
    targetStatus === "a_verifier"
      ? "verification_requested"
      : targetStatus === "rejetee"
      ? "rejected"
      : targetStatus === "reouverte"
      ? "reopened"
      : "status_changed";

  await logActionHistoryEvent({
    actionId,
    eventType,
    oldData: { status: currentAction.status },
    newData: { status: targetStatus },
    comment: motif || `Passage au statut ${targetStatus}`,
  });

  if (incidentId) revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/actions");
  revalidatePath("/dashboard");
  return { error: null };
}

/** Déclarer un blocage métier sur une action. */
export async function blockAction(actionId: string, input: ActionBlockInput): Promise<ActionResult> {
  const parsed = actionBlockSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données de blocage invalides" };
  }

  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée" };

  const { error } = await supabase
    .from("actions_correctives")
    .update({
      status: "bloquee",
      is_blocked: true,
      blocked_at: new Date().toISOString(),
      blocked_reason_category: parsed.data.reasonCategory,
      blocked_reason_detail: parsed.data.reasonDetail,
      blocked_by: user.id,
      unblocked_at: null,
      unblocked_by: null,
    })
    .eq("id", actionId);

  if (error) {
    return { error: "Impossible de bloquer l'action." };
  }

  await logActionHistoryEvent({
    actionId,
    eventType: "blocked",
    newData: { category: parsed.data.reasonCategory, detail: parsed.data.reasonDetail },
    comment: `Blocage [${parsed.data.reasonCategory}] : ${parsed.data.reasonDetail}`,
  });

  revalidatePath("/actions");
  revalidatePath("/dashboard");
  return { error: null };
}

/** Lever un blocage métier sur une action. */
export async function unblockAction(actionId: string, commentText?: string): Promise<ActionResult> {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée" };

  const { error } = await supabase
    .from("actions_correctives")
    .update({
      status: "en_cours",
      is_blocked: false,
      unblocked_at: new Date().toISOString(),
      unblocked_by: user.id,
    })
    .eq("id", actionId);

  if (error) {
    return { error: "Impossible de débloquer l'action." };
  }

  await logActionHistoryEvent({
    actionId,
    eventType: "unblocked",
    comment: commentText || "Levée du blocage et reprise du traitement.",
  });

  revalidatePath("/actions");
  revalidatePath("/dashboard");
  return { error: null };
}

/** Évaluation de l'efficacité d'une action par le vérificateur. */
export async function verifyActionEfficiency(
  actionId: string,
  input: ActionVerificationInput,
): Promise<ActionResult & { childActionId?: string }> {
  const parsed = actionVerificationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Évaluation invalide" };
  }

  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée" };

  const currentAction = await getActionById(actionId);
  if (!currentAction) return { error: "Action introuvable" };

  const { efficaciteStatut, commentaireEfficacite, createChildAction } = parsed.data;

  let newStatus: ActionStatus = currentAction.status;
  const updatePayload: Record<string, unknown> = {
    efficacite_statut: efficaciteStatut,
    date_verification: new Date().toISOString(),
    verificateur_id: user.id,
    commentaire_efficacite: commentaireEfficacite,
  };

  if (efficaciteStatut === "efficace" || efficaciteStatut === "partiellement_efficace") {
    newStatus = "cloturee";
    updatePayload.status = "cloturee";
    updatePayload.cloture_at = new Date().toISOString();
    updatePayload.cloture_par = user.id;
  } else if (efficaciteStatut === "inefficace") {
    // Si inefficace, interdiction de clôturer : retour au statut en_cours / reouverte
    newStatus = "en_cours";
    updatePayload.status = "en_cours";
  }

  const { error } = await supabase.from("actions_correctives").update(updatePayload).eq("id", actionId);

  if (error) {
    return { error: "Impossible de valider l'évaluation d'efficacité." };
  }

  await logActionHistoryEvent({
    actionId,
    eventType: "efficiency_verified",
    newData: { efficaciteStatut, newStatus },
    comment: `Évaluation d'efficacité : ${efficaciteStatut.toUpperCase()} - ${commentaireEfficacite}`,
  });

  let childActionId: string | undefined;

  // Si inefficace et demande de création d'une action fille réflexe
  if (efficaciteStatut === "inefficace" && createChildAction) {
    const formData = new FormData();
    formData.set("description", `[CAPA Fille Récidive] Suite à inefficacité de ${currentAction.codeReference} : ${currentAction.description}`);
    formData.set("responsableId", currentAction.responsableId);
    formData.set("echeance", new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]);
    formData.set("typeAction", "corrective");
    formData.set("domaineQhse", currentAction.domaineQhse);
    formData.set("priorite", "elevee");

    const res = await createAction(
      {
        incidentId: currentAction.incidentId ?? undefined,
        auditId: currentAction.auditId ?? undefined,
        riskId: currentAction.riskId ?? undefined,
        inspectionRunId: currentAction.inspectionRunId ?? undefined,
        workPermitId: currentAction.workPermitId ?? undefined,
        parentActionId: actionId,
      },
      formData,
    );

    if (!res.error && res.actionId) {
      childActionId = res.actionId;
    }
  }

  revalidatePath("/actions");
  revalidatePath("/dashboard");
  return { error: null, childActionId };
}

/** Ajout d'une note dans le journal d'avancement opérationnel action_comments. */
export async function addActionComment(actionId: string, commentText: string): Promise<ActionResult> {
  const parsed = actionCommentSchema.safeParse({ comment: commentText });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Commentaire invalide" };
  }

  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée" };

  const { error } = await supabase.from("action_comments").insert({
    action_id: actionId,
    author_id: user.id,
    comment: parsed.data.comment,
  });

  if (error) {
    return { error: "Impossible d'ajouter ce commentaire d'avancement." };
  }

  await logActionHistoryEvent({
    actionId,
    eventType: "comment_added",
    comment: parsed.data.comment,
  });

  revalidatePath("/actions");
  return { error: null };
}

/** Liste des commentaires d'avancement d'une action. */
export async function listActionComments(actionId: string): Promise<ActionComment[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("action_comments")
    .select("*, author:profiles!action_comments_author_id_fkey(full_name)")
    .eq("action_id", actionId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    companyId: row.company_id,
    actionId: row.action_id,
    authorId: row.author_id,
    authorName: row.author?.full_name || "—",
    comment: row.comment,
    createdAt: row.created_at,
  }));
}

/** Liste de l'audit log immuable action_history d'une action. */
export async function listActionHistory(actionId: string): Promise<ActionHistoryEvent[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("action_history")
    .select("*, actor:profiles!action_history_actor_id_fkey(full_name)")
    .eq("action_id", actionId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    companyId: row.company_id,
    actionId: row.action_id,
    actorId: row.actor_id,
    actorName: row.actor?.full_name || "Système",
    eventType: row.event_type,
    oldData: row.old_data,
    newData: row.new_data,
    comment: row.comment,
    createdAt: row.created_at,
  }));
}

/** Suppression sécurisée d'une action (Rôles habilités uniquement). */
export async function deleteAction(actionId: string, incidentId?: string): Promise<ActionResult> {
  const supabase = (await createClient()) as any;
  const currentAction = await getActionById(actionId);

  if (currentAction && (currentAction.status === "cloturee" || currentAction.status === "rejetee")) {
    return { error: "Une action clôturée ou rejetée fait partie des registres légaux et ne peut pas être supprimée." };
  }

  const { error } = await supabase.from("actions_correctives").delete().eq("id", actionId);

  if (error) {
    return { error: "Impossible de supprimer cette action." };
  }

  if (incidentId) revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/actions");
  revalidatePath("/dashboard");
  return { error: null };
}
