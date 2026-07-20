"use client";

import { useState, useTransition } from "react";
import { createComplianceObligation } from "@/lib/services/compliance.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ObligationForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createComplianceObligation(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        + Ajouter une obligation de conformité
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" required rows={2} placeholder="Ex : Code du travail sénégalais — durée maximale de travail" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Input id="source" name="source" placeholder="Texte réglementaire, norme, contrat…" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reviewDate">Prochaine revue</Label>
          <Input id="reviewDate" name="reviewDate" type="date" />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Enregistrement…" : "Ajouter"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
