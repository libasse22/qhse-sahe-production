"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionSchema } from "@/lib/validation/action.schema";
import type { ActionResult } from "@/lib/services/auth.service";
import type { ActionCorrective, ActionStatus } from "@/lib/types/actions";

const ACTION_SELECT =
  "*, incident:incidents(title), responsable:profiles!actions_correctives_responsable_id_fkey(full_name)";

interface ActionRow {
  id: string;
  incident_id: string;
  description: string;
  responsable_id: string;
  echeance: string;
  status: ActionStatus;
  created_at: string;
  updated_at: string;
  incident: { title: string } | null;
  responsable: { full_name: string } | null;
}

function toAction(row: ActionRow): ActionCorrective {
  return {
    id: row.id,
    incidentId: row.incident_id,
    incidentTitle: row.incident?.title || "—",
    description: row.description,
    responsableId: row.responsable_id,
    responsableName: row.responsable?.full_name || "—",
    echeance: row.echeance,
    status: row.status,
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

export async function createAction(incidentId: string, formData: FormData): Promise<ActionResult> {
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
    incident_id: incidentId,
    description,
    responsable_id: responsableId,
    echeance,
  } as never);

  if (error) {
    return { error: "Impossible de créer l'action corrective." };
  }

  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/actions");
  return { error: null };
}

/**
 * Mise à jour du statut d'une action. Le responsable peut faire évoluer sa
 * propre action ; manager QHSE / admin peuvent tout modifier (cf. trigger
 * protect_action_fields côté base qui verrouille les autres champs).
 */
export async function updateActionStatus(
  actionId: string,
  incidentId: string,
  status: ActionStatus,
): Promise<ActionResult> {
  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from("actions_correctives")
    .update({ status })
    .eq("id", actionId);

  if (error) {
    return { error: "Impossible de mettre à jour cette action." };
  }

  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/actions");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteAction(actionId: string, incidentId: string): Promise<ActionResult> {
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("actions_correctives").delete().eq("id", actionId);

  if (error) {
    return { error: "Impossible de supprimer cette action." };
  }

  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/actions");
  return { error: null };
}
