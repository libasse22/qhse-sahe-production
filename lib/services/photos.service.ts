"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/services/auth.service";
import type { IncidentPhoto } from "@/lib/types/incidents";

const BUCKET = "incident-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1h, régénérée à chaque affichage

/**
 * Liste les photos d'un incident avec une URL signée temporaire (le bucket
 * est privé, cf. migration 0004_incident_photos.sql).
 */
export async function listIncidentPhotos(incidentId: string): Promise<IncidentPhoto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incident_photos")
    .select("*")
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const photos = await Promise.all(
    data.map(async (row) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);

      return {
        id: row.id,
        incidentId: row.incident_id,
        storagePath: row.storage_path,
        uploadedBy: row.uploaded_by,
        createdAt: row.created_at,
        url: signed?.signedUrl ?? null,
      };
    }),
  );

  return photos;
}

/**
 * Retourne une URL de dépôt signée pour l'upload direct depuis le navigateur,
 * ainsi que le chemin de stockage à enregistrer ensuite via
 * confirmIncidentPhoto. Le chemin suit la convention "{incidentId}/{fichier}"
 * requise par les policies Storage.
 */
export async function createUploadTarget(
  incidentId: string,
  fileName: string,
): Promise<{ path: string; token: string } | { error: string }> {
  const supabase = await createClient();
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${incidentId}/${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    return { error: "Impossible de préparer l'upload." };
  }

  return { path: data.path, token: data.token };
}

/** Enregistre les métadonnées d'une photo une fois l'upload terminé côté client. */
export async function confirmIncidentPhoto(
  incidentId: string,
  storagePath: string,
  clientGeneratedId?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée, reconnecte-toi." };

  if (clientGeneratedId) {
    const { data: existing } = await supabase
      .from("incident_photos")
      .select("id")
      .eq("client_generated_id", clientGeneratedId)
      .maybeSingle();
    if (existing) return { error: null };
  }

  const { error } = await supabase.from("incident_photos").insert({
    incident_id: incidentId,
    storage_path: storagePath,
    uploaded_by: user.id,
    client_generated_id: clientGeneratedId ?? null,
  });

  if (error) {
    return { error: "Photo envoyée mais impossible de l'enregistrer." };
  }

  revalidatePath(`/incidents/${incidentId}`);
  return { error: null };
}

export async function deleteIncidentPhoto(
  photoId: string,
  incidentId: string,
  storagePath: string,
): Promise<ActionResult> {
  const supabase = await createClient();

  await supabase.storage.from(BUCKET).remove([storagePath]);
  const { error } = await supabase.from("incident_photos").delete().eq("id", photoId);

  if (error) {
    return { error: "Impossible de supprimer cette photo." };
  }

  revalidatePath(`/incidents/${incidentId}`);
  return { error: null };
}
