"use client";

import { useState, useTransition } from "react";
import { createInterestedParty } from "@/lib/services/compliance.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function InterestedPartyForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createInterestedParty(formData);
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
        + Ajouter une partie intéressée
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nom</Label>
          <Input id="name" name="name" required placeholder="Ex : Inspection du travail" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Catégorie</Label>
          <Input id="category" name="category" placeholder="Autorité, client, salarié, riverain…" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="expectations">Attentes</Label>
        <Textarea id="expectations" name="expectations" rows={2} />
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
