"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, X, FileCheck2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createDocumentUploadTarget, uploadSignedPaperDocument } from "@/lib/services/documents.service";
import { Button } from "@/components/ui/button";

export function PaperSignedUploadModal({
  documentId,
  revisionId,
  revisionCode,
  isOpen,
  onClose,
  onSuccess,
}: {
  documentId: string;
  revisionId: string;
  revisionCode: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Veuillez choisir le scan ou la photo du document signé.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // 1. Upload Target
      const target = await createDocumentUploadTarget(`signed-${file.name}`);
      if ("error" in target) {
        setError(target.error);
        setIsUploading(false);
        return;
      }

      // 2. Transfert Storage privé
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("qhse-documents")
        .uploadToSignedUrl(target.path, target.token, file);

      if (uploadError) {
        setError("Échec de l'envoi du document signé.");
        setIsUploading(false);
        return;
      }

      // 3. Rattachement du chemin signé à la révision sans toucher au fichier original
      startTransition(async () => {
        const res = await uploadSignedPaperDocument({
          documentId,
          revisionId,
          signedStoragePath: target.path,
        });

        setIsUploading(false);

        if (res.error) {
          setError(res.error);
        } else {
          onSuccess();
          onClose();
        }
      });
    } catch {
      setError("Une erreur inattendue s'est produite.");
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Importation Document Signé Papier</h2>
              <p className="text-xs text-muted-foreground">Rattachement à la révision {revisionCode}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-medium text-foreground">Scan ou Photo du Document Signé à la main *</label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                file ? "border-blue-500 bg-blue-500/5" : "border-border hover:border-blue-500/50 hover:bg-accent/50"
              }`}
            >
              <Upload className={`h-6 w-6 mb-1 ${file ? "text-blue-500" : "text-muted-foreground"}`} />
              {file ? (
                <p className="font-medium text-foreground">{file.name} <span className="text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span></p>
              ) : (
                <p className="text-muted-foreground">Cliquez pour choisir le fichier signé réimporté (PDF/JPG/PNG)</p>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Le fichier original de la révision {revisionCode} sera intégralement conservé à des fins de traçabilité audit ISO 9001.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isUploading || isPending}>
              Annuler
            </Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isUploading || isPending}>
              {isUploading || isPending ? "Importation..." : "Rattacher le Document Signé"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
