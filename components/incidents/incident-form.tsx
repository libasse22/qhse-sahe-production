"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/services/auth.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  type Incident,
} from "@/lib/types/incidents";

const initialState: ActionResult = { error: null };

interface IncidentFormProps {
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  initialData?: Pick<Incident, "title" | "description" | "category" | "severity" | "location" | "occurredAt">;
  submitLabel: string;
}

/** Convertit un ISO string en valeur compatible avec un <input type="datetime-local">. */
function toDateTimeLocal(iso: string | undefined): string {
  if (!iso) return new Date().toISOString().slice(0, 16);
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function IncidentForm({ action, initialData, submitLabel }: IncidentFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={150}
          defaultValue={initialData?.title}
          placeholder="Ex : Chute d'un fût de produit chimique — zone de stockage"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Catégorie</Label>
          <Select id="category" name="category" defaultValue={initialData?.category ?? "autre"} required>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="severity">Gravité</Label>
          <Select id="severity" name="severity" defaultValue={initialData?.severity ?? "faible"} required>
            {SEVERITY_ORDER.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="location">Lieu</Label>
          <Input
            id="location"
            name="location"
            required
            defaultValue={initialData?.location}
            placeholder="Ex : Entrepôt B, quai 3"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="occurredAt">Date et heure</Label>
          <Input
            id="occurredAt"
            name="occurredAt"
            type="datetime-local"
            required
            defaultValue={toDateTimeLocal(initialData?.occurredAt)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          required
          rows={5}
          defaultValue={initialData?.description}
          placeholder="Décris précisément les circonstances, les personnes et moyens impliqués…"
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
