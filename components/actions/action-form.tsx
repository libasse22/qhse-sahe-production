"use client";

import { useState, useTransition } from "react";
import { createAction } from "@/lib/services/actions.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/lib/types/auth";

export function ActionForm({
  incidentId,
  assignableUsers,
}: {
  incidentId: string;
  assignableUsers: Profile[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createAction(incidentId, formData);
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
        + Ajouter une action corrective
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="space-y-2">
        <Label htmlFor="description">Description de l&apos;action</Label>
        <Textarea id="description" name="description" required rows={3} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="responsableId">Responsable</Label>
          <Select id="responsableId" name="responsableId" required defaultValue="">
            <option value="" disabled>
              Sélectionner…
            </option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName || u.email}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="echeance">Échéance</Label>
          <Input id="echeance" name="echeance" type="date" required />
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Enregistrement…" : "Créer l'action"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
