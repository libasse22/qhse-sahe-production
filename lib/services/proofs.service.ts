"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/services/auth.service";
import { logActionHistoryEvent, getActionById } from "@/lib/services/actions.service";

export type ProofStage = "avant" | "pendant" | "apres";

export interface SituationProof {
  id: string;
  incidentId: string | null;
  actionId: string | null;
  workPermitId: string | null;
  stage: ProofStage;
  storagePath: string;
  caption: string;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: string;
  url: string | null;
}

const BUCKET = "incident-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 heure

export async function listSituationProofs(params: {
  incidentId?: string;
  actionId?: string;
  workPermitId?: string;
}): Promise<SituationProof[]> {
  const supabase = await createClient();
  let query = supabase
    .from("situation_proofs")
    .select("*, uploader:profiles!situation_proofs_uploaded_by_fkey(full_name)")
    .order("created_at", { ascending: false });

  if (params.incidentId) {
    query = query.eq("incident_id", params.incidentId);
  }
  if (params.actionId) {
    query = query.eq("action_id", params.actionId);
  }
  if (params.workPermitId) {
    query = query.eq("work_permit_id", params.workPermitId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return Promise.all(
    data.map(async (row) => {
      const uploaderName = row.uploader ? (row.uploader as unknown as { full_name: string }).full_name : null;
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);

      return {
        id: row.id,
        incidentId: row.incident_id,
        actionId: row.action_id,
        workPermitId: row.work_permit_id,
        stage: row.stage as ProofStage,
        storagePath: row.storage_path,
        caption: row.caption ?? "",
        uploadedBy: row.uploaded_by,
        uploadedByName: uploaderName,
        createdAt: row.created_at,
        url: signed?.signedUrl ?? null,
      };
    }),
  );
}

export async function confirmSituationProof(params: {
  incidentId?: string;
  actionId?: string;
  workPermitId?: string;
  stage: ProofStage;
  storagePath: string;
  caption?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { error } = await supabase.from("situation_proofs").insert({
    incident_id: params.incidentId ?? null,
    action_id: params.actionId ?? null,
    work_permit_id: params.workPermitId ?? null,
    stage: params.stage,
    storage_path: params.storagePath,
    caption: params.caption ?? "",
    uploaded_by: user.id,
  });

  if (error) {
    return { error: "Impossible d'enregistrer les métadonnées de la preuve." };
  }

  if (params.actionId) {
    await logActionHistoryEvent({
      actionId: params.actionId,
      eventType: "proof_added",
      comment: `Ajout d'une preuve terrain [Étape : ${params.stage.toUpperCase()}]${params.caption ? ` : ${params.caption}` : ""}`,
    });
  }

  if (params.incidentId) revalidatePath(`/incidents/${params.incidentId}`);
  if (params.actionId) revalidatePath("/actions");
  if (params.workPermitId) revalidatePath(`/permis-de-travail/${params.workPermitId}`);
  return { error: null };
}

export async function deleteSituationProof(
  proofId: string,
  storagePath: string,
): Promise<ActionResult> {
  const supabase = await createClient();

  // Contrôle d'immuabilité : vérifier si la preuve appartient à une action clôturée ou rejetée
  const { data: proof } = await supabase.from("situation_proofs").select("action_id").eq("id", proofId).single();

  if (proof?.action_id) {
    const action = await getActionById(proof.action_id);
    if (action && (action.status === "cloturee" || action.status === "rejetee")) {
      return {
        error: "Impossible de supprimer la preuve d'une action CAPA clôturée ou rejetée (dossier d'audit verrouillé).",
      };
    }
  }

  await supabase.storage.from(BUCKET).remove([storagePath]);
  const { error } = await supabase.from("situation_proofs").delete().eq("id", proofId);

  if (error) {
    return { error: "Impossible de supprimer cette preuve." };
  }

  if (proof?.action_id) {
    await logActionHistoryEvent({
      actionId: proof.action_id,
      eventType: "proof_removed",
      comment: "Suppression d'une preuve justificative.",
    });
  }

  revalidatePath("/actions");
  return { error: null };
}
