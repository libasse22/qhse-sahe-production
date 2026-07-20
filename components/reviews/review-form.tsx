"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createManagementReview } from "@/lib/services/reviews.service";
import type { ActionResult } from "@/lib/services/auth.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: ActionResult = { error: null };

export function ReviewForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(async (_prev: ActionResult, formData: FormData) => {
    const result = await createManagementReview(formData);
    if (!result.error) router.push("/revues-de-direction");
    return result;
  }, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Titre</Label>
          <Input id="title" name="title" required maxLength={150} placeholder="Revue de direction — 1er semestre 2026" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reviewDate">Date</Label>
          <Input id="reviewDate" name="reviewDate" type="date" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary">Synthèse</Label>
        <Textarea
          id="summary"
          name="summary"
          required
          rows={6}
          placeholder="Résultats des audits, incidents marquants, atteinte des objectifs, satisfaction client, retours des parties intéressées…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="decisions">Décisions & actions</Label>
        <Textarea id="decisions" name="decisions" rows={4} placeholder="Décisions prises, ressources allouées, axes d'amélioration…" />
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton>Enregistrer la revue</SubmitButton>
    </form>
  );
}
