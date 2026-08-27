"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/services/auth.service";

export type ProofStage = "avant" | "pendant" | "apres";

export interface SituationProof {
  id: string;
  incidentId: string | null;
  actionId: string | null;
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
    stage: params.stage,
    storage_path: params.storagePath,
    caption: params.caption ?? "",
    uploaded_by: user.id,
  });

  if (error) {
    return { error: "Impossible d'enregistrer les métadonnées de la preuve." };
  }

  if (params.incidentId) revalidatePath(`/incidents/${params.incidentId}`);
  if (params.actionId) revalidatePath("/actions");
  return { error: null };
}

export async function deleteSituationProof(
  proofId: string,
  storagePath: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([storagePath]);
  const { error } = await supabase.from("situation_proofs").delete().eq("id", proofId);

  if (error) {
    return { error: "Impossible de supprimer cette preuve." };
  }

  revalidatePath("/actions");
  return { error: null };
}
