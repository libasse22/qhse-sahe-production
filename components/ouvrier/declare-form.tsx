"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Send, Camera, Mic, Square, Trash2, Play } from "lucide-react";
import { syncQueuedIncident } from "@/lib/services/incidents.service";
import { createUploadTarget, confirmIncidentPhoto } from "@/lib/services/photos.service";
import { createVoiceUploadTarget, confirmIncidentVoiceNote } from "@/lib/services/voice.service";
import { createClient } from "@/lib/supabase/client";
import { queueIncident } from "@/lib/offline/sync-manager";
import { SeverityPicker } from "@/components/ouvrier/severity-picker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { IncidentSeverity } from "@/lib/types/incidents";

interface CapturedPhoto {
  blob: Blob;
  fileName: string;
  previewUrl: string;
}

interface CapturedVoiceNote {
  blob: Blob;
  durationSeconds: number;
  previewUrl: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function DeclareForm({ equipmentId }: { equipmentId?: string }) {
  const router = useRouter();
  const [severity, setSeverity] = useState<IncidentSeverity>("faible");
  const [location, setLocation] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [voiceNote, setVoiceNote] = useState<CapturedVoiceNote | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordedMimeTypeRef = useRef<string>("audio/webm");
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      if (voiceNote) URL.revokeObjectURL(voiceNote.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLocate() {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(`Position GPS : ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { timeout: 8000 },
    );
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotos((prev) => [...prev, { blob: file, fileName: file.name, previewUrl: URL.createObjectURL(file) }]);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recordedMimeTypeRef.current = recorder.mimeType || "audio/webm";

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const duration = (Date.now() - startTimeRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: recordedMimeTypeRef.current });
        const reader = new FileReader();
        reader.onloadend = () => {
          setVoiceNote({ blob, durationSeconds: duration, previewUrl: reader.result as string });
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start();
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Impossible d'accÃ©der au microphone. VÃ©rifie les autorisations de ton navigateur.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function removeVoiceNote() {
    if (voiceNote) URL.revokeObjectURL(voiceNote.previewUrl);
    setVoiceNote(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    const clientGeneratedId = crypto.randomUUID();
    const occurredAt = new Date().toISOString();

    try {
      if (!navigator.onLine) throw new Error("offline");

      const result = await syncQueuedIncident({ clientGeneratedId, severity, location, description, occurredAt, equipmentId });

      if (result.error || !result.incidentId) {
        setError(result.error ?? "Impossible d'envoyer le signalement.");
        setIsSubmitting(false);
        return;
      }

      const incidentId = result.incidentId;
      const attachmentErrors: string[] = [];
      const supabase = createClient();

      for (const photo of photos) {
        try {
          const target = await createUploadTarget(incidentId, photo.fileName);
          if ("error" in target) throw new Error(target.error);
          const { error: uploadError } = await supabase.storage
            .from("incident-photos")
            .uploadToSignedUrl(target.path, target.token, photo.blob);
          if (uploadError) throw new Error("Ã©chec envoi photo");
          const confirmResult = await confirmIncidentPhoto(incidentId, target.path);
          if (confirmResult.error) throw new Error(confirmResult.error);
        } catch {
          attachmentErrors.push("une photo");
        }
      }

      if (voiceNote) {
        try {
          const target = await createVoiceUploadTarget(incidentId, voiceNote.blob.type);
          if ("error" in target) throw new Error(target.error);
          const { error: uploadError } = await supabase.storage
            .from("incident-voice-notes")
            .uploadToSignedUrl(target.path, target.token, voiceNote.blob, { contentType: voiceNote.blob.type });
          if (uploadError) throw new Error("Ã©chec envoi vocal");
          const confirmResult = await confirmIncidentVoiceNote(incidentId, target.path, voiceNote.durationSeconds);
          if (confirmResult.error) throw new Error(confirmResult.error);
        } catch {
          attachmentErrors.push("le message vocal");
        }
      }

      if (attachmentErrors.length > 0) {
        setStatusMessage(
          `Signalement envoyÃ©. L'ajout de ${attachmentErrors.join(" et ")} a Ã©chouÃ© â€” tu peux rÃ©essayer depuis la fiche du signalement.`,
        );
      }

      router.push(`/ouvrier/incidents/${incidentId}`);
    } catch {
      // Pas de rÃ©seau (ou coupure pendant l'envoi) : on garde tout en local,
      // rien n'est perdu â€” l'envoi se fera automatiquement plus tard.
      await queueIncident({
        severity,
        location,
        description,
        equipmentId,
        photos: photos.map((p) => ({ blob: p.blob, fileName: p.fileName })),
        voiceNotes: voiceNote ? [{ blob: voiceNote.blob, durationSeconds: voiceNote.durationSeconds }] : [],
      });
      router.push("/ouvrier/mes-declarations");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="mb-3 text-center text-xl font-semibold">GravitÃ© ?</p>
        <SeverityPicker onChange={setSeverity} />
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleLocate}
          disabled={isLocating}
          className="h-16 w-full text-lg"
        >
          <MapPin className="h-6 w-6" />
          {isLocating ? "Localisationâ€¦" : "ðŸ“ OÃ¹ es-tu ?"}
        </Button>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ou Ã©cris le lieu (ex : EntrepÃ´t B)"
          className="mt-3 h-14 w-full rounded-xl border-2 border-input bg-background px-4 text-lg"
        />
      </div>

      <div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Explique en quelques mots (facultatif)â€¦"
          className="text-lg"
        />
      </div>

      <div className="space-y-2">
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => fileInputRef.current?.click()}
          className="h-16 w-full text-lg"
        >
          <Camera className="h-6 w-6" />
          Prendre une photo
        </Button>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-md border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                  aria-label="Retirer la photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {!voiceNote ? (
          !isRecording ? (
            <Button type="button" variant="outline" size="lg" onClick={startRecording} className="h-16 w-full text-lg">
              <Mic className="h-6 w-6" />
              Message vocal
            </Button>
          ) : (
            <Button type="button" variant="destructive" size="lg" onClick={stopRecording} className="h-16 w-full text-lg">
              <Square className="h-6 w-6" />
              ArrÃªter â€” {formatDuration(seconds)}
            </Button>
          )
        ) : (
          <div className="flex items-center gap-3 rounded-xl border-2 border-border bg-card p-3">
            <Play className="h-5 w-5 shrink-0 text-muted-foreground" />
            <audio controls src={voiceNote.previewUrl} className="h-9 flex-1" />
            <button type="button" onClick={removeVoiceNote} aria-label="Supprimer le message vocal">
              <Trash2 className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 p-3 text-center text-base font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
      {statusMessage && (
        <p className="rounded-lg bg-amber-100 p-3 text-center text-base font-medium text-amber-900" role="status">
          {statusMessage}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} className="h-20 w-full text-2xl font-bold">
        <Send className="h-7 w-7" />
        {isSubmitting ? "Envoiâ€¦" : "ENVOYER"}
      </Button>

      <button
        type="button"
        onClick={() => router.push("/ouvrier/mes-declarations")}
        className="w-full text-center text-base text-muted-foreground underline"
      >
        Voir mes signalements
      </button>
    </form>
  );
}




