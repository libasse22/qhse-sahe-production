"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { attachPolicyPdf, createPolicy, createPolicyPdfUploadTarget } from "@/lib/services/policy.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function PolicyForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await createPolicy(formData);
      if (result.error || !result.id) {
        setError(result.error ?? "Impossible de publier la politique.");
        return;
      }

      const file = fileInputRef.current?.files?.[0];
      if (file) {
        const target = await createPolicyPdfUploadTarget(file.name);
        if ("error" in target) {
          setError(target.error);
          return;
        }

        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from("qhse-documents")
          .uploadToSignedUrl(target.path, target.token, file);

        if (uploadError) {
          setError("Politique publiée, mais l'envoi du PDF a échoué.");
          return;
        }

        const attachResult = await attachPolicyPdf(result.id, target.path);
        if (attachResult.error) {
          setError(attachResult.error);
          return;
        }
      }

      router.push("/politique");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Titre</Label>
        <Input id="title" name="title" required maxLength={150} placeholder="Politique QHSE 2026" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Résumé (facultatif si un PDF est joint)</Label>
        <Textarea
          id="content"
          name="content"
          rows={8}
          placeholder="Notre engagement en matière de qualité, hygiène, sécurité et environnement…"
        />
      </div>

      <div className="space-y-2">
        <Label>Document PDF (facultatif)</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <FileUp className="h-4 w-4" />
          {fileName ? "Changer de fichier" : "Joindre un PDF"}
        </Button>
        {fileName && <p className="text-xs text-muted-foreground">Fichier sélectionné : {fileName}</p>}
        <p className="text-xs text-muted-foreground">
          Publier une nouvelle version remplace automatiquement la précédente et redemande un
          accusé de lecture à tous les utilisateurs.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} size="lg">
        {isSubmitting ? "Publication…" : "Publier cette version"}
      </Button>
    </form>
  );
}
