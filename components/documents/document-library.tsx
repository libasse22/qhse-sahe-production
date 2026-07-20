"use client";

import { useRef, useState, useTransition } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { confirmDocument, createDocumentUploadTarget, deleteDocument } from "@/lib/services/documents.service";
import type { QhseDocument } from "@/lib/types/document";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DocumentLibrary({ initialDocuments, canManage }: { initialDocuments: QhseDocument[]; canManage: boolean }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Général");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!title.trim()) {
      setError("Indique un titre avant de choisir le fichier.");
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const target = await createDocumentUploadTarget(file.name);
      if ("error" in target) {
        setError(target.error);
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("qhse-documents")
        .uploadToSignedUrl(target.path, target.token, file);

      if (uploadError) {
        setError("Échec de l'envoi du document.");
        return;
      }

      const result = await confirmDocument(target.path, title, category);
      if (result.error) {
        setError(result.error);
        return;
      }

      setDocuments((prev) => [
        {
          id: target.path,
          title,
          category,
          storagePath: target.path,
          version: 1,
          uploadedByName: "",
          createdAt: new Date().toISOString(),
          url: null,
        },
        ...prev,
      ]);
      setTitle("");
    } finally {
      setIsUploading(false);
    }
  }

  function handleDelete(doc: QhseDocument) {
    setError(null);
    startTransition(async () => {
      const result = await deleteDocument(doc.id, doc.storagePath);
      if (result.error) {
        setError(result.error);
      } else {
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      }
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Titre</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Procédure gestion des EPI" className="w-56" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Catégorie</label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} className="w-40" />
          </div>
          <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
          <Button type="button" variant="outline" disabled={isUploading} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            {isUploading ? "Envoi en cours…" : "Déposer un fichier"}
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun document.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.category} · v{doc.version} · {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {doc.url && (
                  <a href={doc.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                    <Download className="h-4 w-4" />
                  </a>
                )}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Supprimer le document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
