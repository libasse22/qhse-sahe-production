"use client";

import { useState, useTransition } from "react";
import { addFinding } from "@/lib/services/audits.service";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FINDING_TYPE_LABELS, FINDING_TYPE_ORDER } from "@/lib/types/audit";

export function FindingForm({ auditId }: { auditId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addFinding(auditId, formData);
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
        + Ajouter un constat
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="space-y-2">
        <Label htmlFor="type">Type de constat</Label>
        <Select id="type" name="type" defaultValue="conformite">
          {FINDING_TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {FINDING_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" required rows={3} />
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
