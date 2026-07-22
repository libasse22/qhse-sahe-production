"use client";

function pickSupportedMimeType(): string {
  const candidates = ["audio/mp4", "audio/webm", "audio/ogg", "audio/wav"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}


import { useEffect, useRef, useState } from "react";
import { Mic, Play, Square, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  confirmIncidentVoiceNote,
  createVoiceUploadTarget,
  deleteIncidentVoiceNote,
  type IncidentVoiceNote,
} from "@/lib/services/voice.service";
import { Button } from "@/components/ui/button";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceNotes({
  incidentId,
  initialNotes,
  canRecord,
  large = false,
}: {
  incidentId: string;
  initialNotes: IncidentVoiceNote[];
  canRecord: boolean;
  /** Mode "large" : gros bouton tactile pour l'interface Ouvrier. */
  large?: boolean;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const recordedMimeTypeRef = useRef<string>("audio/webm");

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chosenMimeType = pickSupportedMimeType();
      const recorder = chosenMimeType ? new MediaRecorder(stream, { mimeType: chosenMimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recordedMimeTypeRef.current = recorder.mimeType || "audio/webm";

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const duration = (Date.now() - startTimeRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: recordedMimeTypeRef.current });
        await uploadRecording(blob, duration);
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

  async function uploadRecording(blob: Blob, duration: number) {
    setIsUploading(true);
    try {
      const target = await createVoiceUploadTarget(incidentId, blob.type);
      if ("error" in target) {
        setError(target.error);
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("incident-voice-notes")
        .uploadToSignedUrl(target.path, target.token, blob, { contentType: blob.type });

      if (uploadError) {
        setError("Ã‰chec de l'envoi du message vocal.");
        return;
      }

      const result = await confirmIncidentVoiceNote(incidentId, target.path, duration);
      if (result.error) {
        setError(result.error);
        return;
      }

      setNotes((prev) => [
        {
          id: target.path,
          incidentId,
          storagePath: target.path,
          durationSeconds: Math.round(duration),
          uploadedBy: "",
          createdAt: new Date().toISOString(),
          url: URL.createObjectURL(blob),
        },
        ...prev,
      ]);
    } finally {
      setIsUploading(false);
    }
  }

  function handleDelete(note: IncidentVoiceNote) {
    setError(null);
    deleteIncidentVoiceNote(note.id, incidentId, note.storagePath).then((result) => {
      if (result.error) {
        setError(result.error);
      } else {
        setNotes((prev) => prev.filter((n) => n.id !== note.id));
      }
    });
  }

  return (
    <div className="space-y-3">
      {canRecord && (
        <div>
          {!isRecording ? (
            <Button
              type="button"
              onClick={startRecording}
              disabled={isUploading}
              size={large ? "lg" : "sm"}
              variant="outline"
              className={large ? "h-16 w-full text-lg" : ""}
            >
              <Mic className={large ? "h-6 w-6" : "h-4 w-4"} />
              {isUploading ? "Envoi en coursâ€¦" : "Enregistrer un message vocal"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={stopRecording}
              size={large ? "lg" : "sm"}
              variant="destructive"
              className={large ? "h-16 w-full text-lg" : ""}
            >
              <Square className={large ? "h-6 w-6" : "h-4 w-4"} />
              ArrÃªter â€” {formatDuration(seconds)}
            </Button>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun message vocal.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Play className="h-4 w-4 shrink-0 text-muted-foreground" />
              {note.url && <audio controls src={note.url} className="h-9 w-full max-w-xs" />}
              {note.durationSeconds != null && (
                <span className="text-xs text-muted-foreground">{formatDuration(note.durationSeconds)}</span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(note)}
                className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Supprimer le message vocal"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}




