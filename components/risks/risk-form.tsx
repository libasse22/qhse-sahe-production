"use client";

import { useState, useTransition } from "react";
import { createRisk } from "@/lib/services/risks.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RISK_CATEGORY_LABELS, RISK_CATEGORY_ORDER } from "@/lib/types/risk";
import type { Profile } from "@/lib/types/auth";

export function RiskForm({ assignableUsers }: { assignableUsers: Profile[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createRisk(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        + Identifier un risque
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Titre</Label>
          <Input id="title" name="title" required maxLength={150} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Catégorie</Label>
          <Select id="category" name="category" defaultValue="autre">
            {RISK_CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {RISK_CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="probability">Probabilité (1-5)</Label>
          <Select id="probability" name="probability" defaultValue="1">
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gravity">Gravité (1-5)</Label>
          <Select id="gravity" name="gravity" defaultValue="1">
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerId">Propriétaire du risque</Label>
          <Select id="ownerId" name="ownerId" defaultValue="">
            <option value="">Non assigné</option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="treatment">Traitement envisagé</Label>
        <Textarea id="treatment" name="treatment" rows={2} placeholder="Mesures pour réduire probabilité et/ou gravité" />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Enregistrement…" : "Ajouter au registre"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
