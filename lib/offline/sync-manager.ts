"use client";

import { createClient } from "@/lib/supabase/client";
import { syncQueuedIncident } from "@/lib/services/incidents.service";
import { createUploadTarget, confirmIncidentPhoto } from "@/lib/services/photos.service";
import { createVoiceUploadTarget, confirmIncidentVoiceNote } from "@/lib/services/voice.service";
import { deleteDraft, getAllDrafts, putDraft } from "./db";
import type { PendingIncident, QueuedPhoto, QueuedVoiceNote } from "./types";
import type { IncidentSeverity } from "@/lib/types/incidents";

const QUEUE_UPDATED_EVENT = "qhse-offline-queue-updated";

function notifyQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(QUEUE_UPDATED_EVENT));
  }
}

export function onQueueChanged(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(QUEUE_UPDATED_EVENT, callback);
  return () => window.removeEventListener(QUEUE_UPDATED_EVENT, callback);
}

export async function getPendingCount(): Promise<number> {
  try {
    return (await getAllDrafts()).length;
  } catch {
    return 0;
  }
}

/** Met un signalement en file d'attente locale. Fonctionne sans réseau. */
export async function queueIncident(data: {
  severity: IncidentSeverity;
  location: string;
  description: string;
  equipmentId?: string | null;
  photos: { blob: Blob; fileName: string }[];
  voiceNotes: { blob: Blob; durationSeconds: number }[];
}): Promise<void> {
  const draft: PendingIncident = {
    clientGeneratedId: crypto.randomUUID(),
    severity: data.severity,
    location: data.location,
    description: data.description,
    occurredAt: new Date().toISOString(),
    equipmentId: data.equipmentId ?? null,
    photos: data.photos.map((p) => ({ clientGeneratedId: crypto.randomUUID(), blob: p.blob, fileName: p.fileName })),
    voiceNotes: data.voiceNotes.map((v) => ({
      clientGeneratedId: crypto.randomUUID(),
      blob: v.blob,
      durationSeconds: v.durationSeconds,
    })),
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  await putDraft(draft);
  notifyQueueChanged();
  // Tentative immédiate au cas où le réseau serait en fait disponible
  // (ex : navigator.onLine imprécis sur certains appareils).
  void syncAll();
}

async function uploadQueuedPhoto(incidentId: string, photo: QueuedPhoto): Promise<void> {
  const target = await createUploadTarget(incidentId, photo.fileName);
  if ("error" in target) throw new Error(target.error);

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from("incident-photos")
    .uploadToSignedUrl(target.path, target.token, photo.blob);
  if (uploadError) throw new Error("Échec de l'envoi d'une photo.");

  const result = await confirmIncidentPhoto(incidentId, target.path, photo.clientGeneratedId);
  if (result.error) throw new Error(result.error);
}

async function uploadQueuedVoiceNote(incidentId: string, note: QueuedVoiceNote): Promise<void> {
  const target = await createVoiceUploadTarget(incidentId);
  if ("error" in target) throw new Error(target.error);

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from("incident-voice-notes")
    .uploadToSignedUrl(target.path, target.token, note.blob);
  if (uploadError) throw new Error("Échec de l'envoi d'un message vocal.");

  const result = await confirmIncidentVoiceNote(incidentId, target.path, note.durationSeconds, note.clientGeneratedId);
  if (result.error) throw new Error(result.error);
}

let syncInFlight = false;

/**
 * Tente d'envoyer tous les brouillons en attente. Sûre à appeler plusieurs
 * fois en parallèle (un verrou évite les envois concurrents) et à répéter
 * régulièrement : un brouillon déjà synchronisé avec succès est simplement
 * absent de la file au prochain appel.
 */
export async function syncAll(): Promise<void> {
  if (syncInFlight) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  syncInFlight = true;
  try {
    const drafts = await getAllDrafts();
    for (const draft of drafts) {
      if (draft.status === "syncing") continue;
      try {
        await putDraft({ ...draft, status: "syncing" });
        notifyQueueChanged();

        const result = await syncQueuedIncident({
          clientGeneratedId: draft.clientGeneratedId,
          severity: draft.severity,
          location: draft.location,
          description: draft.description,
          occurredAt: draft.occurredAt,
          equipmentId: draft.equipmentId,
        });

        if (result.error || !result.incidentId) {
          throw new Error(result.error ?? "Échec de l'envoi du signalement.");
        }

        for (const photo of draft.photos) {
          await uploadQueuedPhoto(result.incidentId, photo);
        }
        for (const note of draft.voiceNotes) {
          await uploadQueuedVoiceNote(result.incidentId, note);
        }

        await deleteDraft(draft.clientGeneratedId);
        notifyQueueChanged();
      } catch (err) {
        // Coupure réseau ou erreur serveur : on garde le brouillon, il sera
        // retenté automatiquement (retour en ligne, minuteur périodique).
        await putDraft({
          ...draft,
          status: "pending",
          lastError: err instanceof Error ? err.message : "Erreur inconnue",
        });
        notifyQueueChanged();
      }
    }
  } finally {
    syncInFlight = false;
  }
}

let watcherStarted = false;

/** À appeler une fois côté client (ex. dans le layout Ouvrier) pour activer la synchronisation automatique. */
export function startOfflineSyncWatcher(): void {
  if (watcherStarted || typeof window === "undefined") return;
  watcherStarted = true;

  window.addEventListener("online", () => void syncAll());
  // Certains réseaux redeviennent utilisables sans déclencher l'évènement
  // "online" (ex. portail captif) : on retente périodiquement en filet de
  // sécurité tant qu'il reste des brouillons.
  setInterval(() => void syncAll(), 45_000);

  void syncAll();
}
