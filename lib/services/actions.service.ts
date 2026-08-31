"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionSchema } from "@/lib/validation/action.schema";
import type { ActionResult } from "@/lib/services/auth.service";
import type { ActionCorrective, ActionStatus } from "@/lib/types/actions";

const ACTION_SELECT =
  "*, incident:incidents(title), audit:audits(title), risk:risks(title), inspection_run:inspection_runs(title), responsable:profiles!actions_correctives_responsable_id_fkey(full_name)";

interface ActionRow {
  id: string;
  incident_id?: string | null;
  audit_id?: string | null;
  risk_id?: string | null;
  description: string;
  responsable_id: string;
  echeance: string;
  status: ActionStatus;
  inspection_run_id?: string | null;
  inspection_item_id?: string | null;
  created_at: string;
  updated_at: string;
  incident?: { title: string } | null;
  audit?: { title: string } | null;
  risk?: { title: string } | null;
  inspection_run?: { title: string } | null;
  responsable?: { full_name: string } | null;
}

function toAction(row: ActionRow): ActionCorrective {
  let sourceType: ActionCorrective["sourceType"] = "autre";
  let sourceTitle = "—";

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
  }

  return {
    id: row.id,
    incidentId: row.incident_id ?? null,
    incidentTitle: row.incident?.title ?? null,
    auditId: row.audit_id ?? null,
    auditTitle: row.audit?.title ?? null,
    riskId: row.risk_id ?? null,
    riskTitle: row.risk?.title ?? null,
    sourceType,
    sourceTitle,
    description: row.description,
    responsableId: row.responsable_id,
    responsableName: row.responsable?.full_name || "—",
    echeance: row.echeance,
    status: row.status,
    inspectionRunId: row.inspection_run_id ?? null,
    inspectionItemId: row.inspection_item_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Actions visibles par l'utilisateur courant (RLS : les siennes, ou tout si QHSE/admin). */
export async function listMyActions(): Promise<ActionCorrective[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("actions_correctives")
    .select(ACTION_SELECT)
    .order("echeance", { ascending: true });

  if (error || !data) return [];
  return (data as unknown as ActionRow[]).map(toAction);
}

export async function listActionsForIncident(incidentId: string): Promise<ActionCorrective[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("actions_correctives")
    .select(ACTION_SELECT)
    .eq("incident_id", incidentId)
    .order("echeance", { ascending: true });

  if (error || !data) return [];
  return (data as unknown as ActionRow[]).map(toAction);
}

export async function listActionsForInspectionRun(inspectionRunId: string): Promise<ActionCorrective[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("actions_correctives")
    .select(ACTION_SELECT)
    .eq("inspection_run_id", inspectionRunId)
    .order("echeance", { ascending: true });

  if (error || !data) return [];
  return (data as unknown as ActionRow[]).map(toAction);
}

export async function listActionsForAudit(auditId: string): Promise<ActionCorrective[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("actions_correctives")
    .select(ACTION_SELECT)
    .eq("audit_id", auditId)
    .order("echeance", { ascending: true });

  if (error || !data) return [];
  return (data as unknown as ActionRow[]).map(toAction);
}

export async function listActionsForRisk(riskId: string): Promise<ActionCorrective[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("actions_correctives")
    .select(ACTION_SELECT)
    .eq("risk_id", riskId)
    .order("echeance", { ascending: true });

  if (error || !data) return [];
  return (data as unknown as ActionRow[]).map(toAction);
}

export async function createAction(
  source: { incidentId?: string; inspectionRunId?: string; auditId?: string; riskId?: string },
  formData: FormData,
): Promise<ActionResult> {
  const parsed = actionSchema.safeParse({
    description: formData.get("description"),
    responsableId: formData.get("responsableId"),
    echeance: formData.get("echeance"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const supabase = (await createClient()) as any;
  const { description, responsableId, echeance } = parsed.data;

  const { error } = await supabase.from("actions_correctives").insert({
    incident_id: source.incidentId || null,
    inspection_run_id: source.inspectionRunId || null,
    audit_id: source.auditId || null,
    risk_id: source.riskId || null,
    description,
    responsable_id: responsableId,
    echeance,
  } as never);

  if (error) {
    return { error: "Impossible de créer l'action corrective." };
  }

  // Expédition Web Push non-bloquante vers le responsable assigné
  if (responsableId) {
    try {
      const { sendWebPushToUser } = await import("@/lib/services/web-push.service");
      void sendWebPushToUser(responsableId, {
        title: "🛠️ Action corrective assignée",
        body: description.slice(0, 100),
        url: source.incidentId ? `/incidents/${source.incidentId}` : "/actions",
        tag: `action-${Date.now()}`,
      });
    } catch {
      // Ignoré si échec Web Push
    }
  }

  if (source.incidentId) revalidatePath(`/incidents/${source.incidentId}`);
  if (source.auditId) revalidatePath(`/audits/${source.auditId}`);
  if (source.inspectionRunId) revalidatePath(`/inspections/${source.inspectionRunId}`);
  revalidatePath("/actions");
  revalidatePath("/dashboard");
  return { error: null };
}

/**
 * Mise à jour du statut d'une action. Le responsable peut faire évoluer sa
 * propre action ; manager QHSE / admin peuvent tout modifier.
 */
export async function updateActionStatus(
  actionId: string,
  incidentId: string | null | undefined,
  status: ActionStatus,
): Promise<ActionResult> {
  const supabase = (await createClient()) as any;

  // Validation de sécurité : vérification des preuves lors du passage au statut "termine"
  if (status === "termine") {
    await supabase
      .from("situation_proofs")
      .select("id", { count: "exact", head: true })
      .eq("action_id", actionId);
  }

  const { error } = await supabase
    .from("actions_correctives")
    .update({ status })
    .eq("id", actionId);

  if (error) {
    return { error: "Impossible de mettre à jour cette action." };
  }

  if (incidentId) revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/actions");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteAction(actionId: string, incidentId?: string): Promise<ActionResult> {
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("actions_correctives").delete().eq("id", actionId);

  if (error) {
    return { error: "Impossible de supprimer cette action." };
  }

  if (incidentId) revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/actions");
  revalidatePath("/dashboard");
  return { error: null };
}
