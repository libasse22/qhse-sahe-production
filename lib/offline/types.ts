import type { IncidentSeverity } from "@/lib/types/incidents";

export interface QueuedPhoto {
  clientGeneratedId: string;
  blob: Blob;
  fileName: string;
}

export interface QueuedVoiceNote {
  clientGeneratedId: string;
  blob: Blob;
  durationSeconds: number;
}

export interface PendingIncident {
  clientGeneratedId: string;
  severity: IncidentSeverity;
  location: string;
  description: string;
  occurredAt: string;
  equipmentId: string | null;
  photos: QueuedPhoto[];
  voiceNotes: QueuedVoiceNote[];
  createdAt: string;
  /** "pending" : en attente d'une tentative. "syncing" : envoi en cours. "error" : dernière tentative a échoué pour une raison qui ne se résoudra pas seule (à distinguer d'une simple coupure réseau, qui laisse l'item en "pending"). */
  status: "pending" | "syncing" | "error";
  lastError?: string;
}
