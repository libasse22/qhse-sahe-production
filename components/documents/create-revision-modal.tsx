"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, X, FilePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createDocumentUploadTarget, createDocumentRevision } from "@/lib/services/documents.service";
import { Button } from "@/components/ui/button";

export function CreateRevisionModal({
  documentId,
  documentTitle,
  currentRevisionCode,
  isOpen,
  onClose,
  onSuccess,
}: {
  documentId: string;
  documentTitle: string;
  currentRevisionCode: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [changeSummary, setChangeSummary] = useState("");
  const [isMajorVersion, setIsMajorVersion] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Veuillez sélectionner le nouveau fichier de révision.");
      return;
    }
    if (!changeSummary.trim()) {
      setError("Veuillez saisir un résumé des modifications apportées.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // 1. Upload Target
      const target = await createDocumentUploadTarget(file.name);
      if ("error" in target) {
        setError(target.error);
        setIsUploading(false);
        return;
      }

      // 2. Transfert Storage
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("qhse-documents")
        .uploadToSignedUrl(target.path, target.token, file);

      if (uploadError) {
        setError("Échec de l'envoi du fichier de révision.");
        setIsUploading(false);
        return;
      }

      // 3. Enregistrement nouvelle révision (REV01, REV02...)
      startTransition(async () => {
        const result = await createDocumentRevision({
          documentId,
          storagePath: target.path,
          changeSummary: changeSummary.trim(),
          isMajorVersion,
        });

        setIsUploading(false);

        if (result.error) {
          setError(result.error);
        } else {
          onSuccess();
          onClose();
        }
      });
    } catch {
      setError("Une erreur s'est produite lors de la création de la révision.");
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
              <FilePlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Nouvelle Révision Documentaire</h2>
              <p className="text-xs text-muted-foreground">Document : {documentTitle} (Actuelle: {currentRevisionCode})</p>
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
          {/* Nouveau Fichier */}
          <div className="space-y-1.5">
            <label className="font-medium text-foreground">Fichier de la nouvelle version *</label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                file ? "border-amber-500 bg-amber-500/5" : "border-border hover:border-amber-500/50 hover:bg-accent/50"
              }`}
            >
              <Upload className={`h-6 w-6 mb-1 ${file ? "text-amber-500" : "text-muted-foreground"}`} />
              {file ? (
                <p className="font-medium text-foreground">{file.name} <span className="text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span></p>
              ) : (
                <p className="text-muted-foreground">Cliquez pour importer la nouvelle version du fichier</p>
              )}
            </div>
          </div>

          {/* Résumé des modifications */}
          <div className="space-y-1">
            <label className="font-medium text-foreground">Résumé des modifications (Change Summary) *</label>
            <textarea
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="ex: Mise à jour des équipements de protection selon la révision de la norme ISO 45001"
              rows={3}
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>

          {/* Version majeure / mineure */}
          <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
            <input
              type="checkbox"
              checked={isMajorVersion}
              onChange={(e) => setIsMajorVersion(e.target.checked)}
              className="rounded border-input text-amber-600 focus:ring-amber-500"
            />
            <span>Incrémenter la version majeure (ex: v1.0 → v2.0 au lieu de v1.0 → v1.1)</span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isUploading || isPending}>
              Annuler
            </Button>
            <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={isUploading || isPending}>
              {isUploading || isPending ? "Création en cours..." : "Créer la Révision"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
