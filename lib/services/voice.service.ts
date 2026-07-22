"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/services/auth.service";

const BUCKET = "incident-voice-notes";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export interface IncidentVoiceNote {
  id: string;
  incidentId: string;
  storagePath: string;
  durationSeconds: number | null;
  uploadedBy: string;
  createdAt: string;
  url: string | null;
}

export async function listIncidentVoiceNotes(incidentId: string): Promise<IncidentVoiceNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incident_voice_notes")
    .select("*")
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return Promise.all(
    data.map(async (row) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);

      return {
        id: row.id,
        incidentId: row.incident_id,
        storagePath: row.storage_path,
        durationSeconds: row.duration_seconds,
        uploadedBy: row.uploaded_by,
        createdAt: row.created_at,
        url: signed?.signedUrl ?? null,
      };
    }),
  );
}

function extensionForMimeType(mimeType: string | undefined): string {
  if (!mimeType) return "webm";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("aac")) return "aac";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export async function createVoiceUploadTarget(
  incidentId: string,
  mimeType?: string,
): Promise<{ path: string; token: string } | { error: string }> {
  const supabase = await createClient();
  const ext = extensionForMimeType(mimeType);
  const path = `${incidentId}/${Date.now()}-note.${ext}`;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    return { error: "Impossible de préparer l'envoi du message vocal." };
  }

  return { path: data.path, token: data.token };
}

export async function confirmIncidentVoiceNote(
  incidentId: string,
  storagePath: string,
  durationSeconds: number,
  clientGeneratedId?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée, reconnecte-toi." };

  if (clientGeneratedId) {
    const { data: existing } = await supabase
      .from("incident_voice_notes")
      .select("id")
      .eq("client_generated_id", clientGeneratedId)
      .maybeSingle();
    if (existing) return { error: null };
  }

  const { error } = await supabase.from("incident_voice_notes").insert({
    incident_id: incidentId,
    storage_path: storagePath,
    duration_seconds: Math.round(durationSeconds),
    uploaded_by: user.id,
    client_generated_id: clientGeneratedId ?? null,
  });

  if (error) {
    return { error: "Message vocal envoyé mais impossible de l'enregistrer." };
  }

  revalidatePath(`/ouvrier/incidents/${incidentId}`);
  revalidatePath(`/incidents/${incidentId}`);
  return { error: null };
}

export async function deleteIncidentVoiceNote(
  voiceNoteId: string,
  incidentId: string,
  storagePath: string,
): Promise<ActionResult> {
  const supabase = await createClient();

  await supabase.storage.from(BUCKET).remove([storagePath]);
  const { error } = await supabase.from("incident_voice_notes").delete().eq("id", voiceNoteId);

  if (error) {
    return { error: "Impossible de supprimer ce message vocal." };
  }

  revalidatePath(`/ouvrier/incidents/${incidentId}`);
  revalidatePath(`/incidents/${incidentId}`);
  return { error: null };
}

