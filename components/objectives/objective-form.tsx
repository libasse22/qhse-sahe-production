"use client";

import { useState, useTransition } from "react";
import { createObjective } from "@/lib/services/objectives.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/lib/types/auth";

export function ObjectiveForm({ assignableUsers }: { assignableUsers: Profile[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createObjective(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Définir un objectif</Button>;
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="space-y-2">
        <Label htmlFor="title">Titre</Label>
        <Input id="title" name="title" required maxLength={150} placeholder="Ex : Réduire le taux de fréquence des accidents" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="targetValue">Valeur cible</Label>
          <Input id="targetValue" name="targetValue" type="number" step="any" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unité</Label>
          <Input id="unit" name="unit" placeholder="%, jours, incidents…" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deadline">Échéance</Label>
          <Input id="deadline" name="deadline" type="date" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ownerId">Responsable</Label>
        <Select id="ownerId" name="ownerId" defaultValue="">
          <option value="">Non assigné</option>
          {assignableUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName || u.email}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Enregistrement…" : "Créer l'objectif"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
