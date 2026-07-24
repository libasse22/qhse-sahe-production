"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Mic, Square } from "lucide-react";
import { sendMessage, createMessageAttachmentUploadTarget, confirmMessageAttachment } from "@/lib/services/messages.service";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function pickSupportedMimeType(): string {
  const candidates = ["audio/mp4", "audio/webm", "audio/ogg", "audio/wav"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("aac")) return "aac";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeTypeRef = useRef<string>("audio/webm");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isPending) return;

    setError(null);
    setContent("");

    startTransition(async () => {
      const result = await sendMessage(conversationId, trimmed);
      if (result.error) {
        setError(result.error);
        setContent(trimmed);
      }
    });
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chosenMimeType = pickSupportedMimeType();
      const recorder = chosenMimeType ? new MediaRecorder(stream, { mimeType: chosenMimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mimeTypeRef.current = recorder.mimeType || "audio/webm";

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        await uploadVoiceMessage(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setError("Impossible d'acceder au microphone.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function uploadVoiceMessage(blob: Blob) {
    setIsUploadingVoice(true);
    setError(null);
    try {
      const msgResult = await sendMessage(conversationId, null as unknown as string);
      if (msgResult.error || !msgResult.messageId) {
        setError(msgResult.error ?? "Erreur lors de la creation du message.");
        return;
      }

      const ext = extensionForMimeType(blob.type);
      const fileName = `voice-${Date.now()}.${ext}`;
      const target = await createMessageAttachmentUploadTarget(msgResult.messageId, fileName);
      if ("error" in target) {
        setError(target.error);
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("message-attachments")
        .uploadToSignedUrl(target.path, target.token, blob, { contentType: blob.type });

      if (uploadError) {
        setError("Echec de l'envoi du message vocal.");
        return;
      }

      const confirmResult = await confirmMessageAttachment(
        msgResult.messageId,
        target.path,
        fileName,
        blob.type,
        conversationId,
      );
      if (confirmResult.error) {
        setError(confirmResult.error);
        return;
      }

      router.refresh();
    } finally {
      setIsUploadingVoice(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border pt-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as unknown as React.FormEvent);
          }
        }}
        placeholder="Ecris un message..."
        rows={1}
        disabled={isRecording || isUploadingVoice}
        className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      {!isRecording ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={startRecording}
          disabled={isUploadingVoice}
        >
          <Mic className="h-4 w-4" />
        </Button>
      ) : (
        <Button type="button" size="sm" variant="destructive" onClick={stopRecording}>
          <Square className="h-4 w-4" />
        </Button>
      )}
      <Button type="submit" size="sm" disabled={isPending || isRecording || isUploadingVoice || !content.trim()}>
        <Send className="h-4 w-4" />
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
