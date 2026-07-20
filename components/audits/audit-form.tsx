"use client";

import { useActionState } from "react";
import { createAudit } from "@/lib/services/audits.service";
import type { ActionResult } from "@/lib/services/auth.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/auth/submit-button";
import type { Profile } from "@/lib/types/auth";

const initialState: ActionResult = { error: null };

export function AuditForm({ assignableUsers }: { assignableUsers: Profile[] }) {
  const [state, formAction] = useActionState(
    async (_prev: ActionResult, formData: FormData) => createAudit(formData),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Titre de l&apos;audit</Label>
        <Input id="title" name="title" required maxLength={150} placeholder="Audit sécurité — Entrepôt B" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="scope">Périmètre</Label>
        <Textarea id="scope" name="scope" required rows={2} placeholder="Processus, site ou activité audités" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="criteria">Critères d&apos;audit</Label>
        <Textarea id="criteria" name="criteria" required rows={2} placeholder="Référentiel : ISO 45001, procédure interne…" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="auditorId">Auditeur</Label>
          <Select id="auditorId" name="auditorId" required defaultValue="">
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
          <Label htmlFor="plannedDate">Date planifiée</Label>
          <Input id="plannedDate" name="plannedDate" type="date" required />
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton>Planifier l&apos;audit</SubmitButton>
    </form>
  );
}
