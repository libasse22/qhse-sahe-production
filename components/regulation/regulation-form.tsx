"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRegulation, createRegulationPdfUploadTarget, attachRegulationPdf } from "@/lib/services/regulation.service";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function RegulationForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createRegulation(formData);
      if (result.error || !result.id) {
        setError(result.error ?? "Erreur inconnue.");
        return;
      }

      if (pdfFile) {
        const target = await createRegulationPdfUploadTarget(pdfFile.name);
        if ("error" in target) {
          setError("Reglement publie, mais " + target.error.toLowerCase());
          router.push("/reglement-interieur");
          return;
        }

        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from("qhse-documents")
          .uploadToSignedUrl(target.path, target.token, pdfFile, { contentType: pdfFile.type });

        if (uploadError) {
          setError("Reglement publie, mais l'envoi du PDF a echoue.");
          router.push("/reglement-interieur");
          return;
        }

        await attachRegulationPdf(result.id, target.path);
      }

      router.push("/reglement-interieur");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Titre</Label>
        <Input id="title" name="title" type="text" placeholder="Reglement interieur" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Contenu (texte)</Label>
        <Textarea id="content" name="content" rows={10} placeholder="Texte du reglement interieur (facultatif si un PDF est joint)..." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pdf">Document PDF (facultatif)</Label>
        <Input
          id="pdf"
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-muted-foreground">
          Depuis un telephone, tu peux aussi prendre en photo ou choisir le fichier depuis tes documents.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Publication..." : "Publier"}
      </Button>
    </form>
  );
}
