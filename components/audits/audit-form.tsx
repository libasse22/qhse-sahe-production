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
import type { Site } from "@/lib/services/sites.service";

const initialState: ActionResult = { error: null };

export function AuditForm({
  assignableUsers,
  sites = [],
}: {
  assignableUsers: Profile[];
  sites?: Site[];
}) {
  const [state, formAction] = useActionState(
    async (_prev: ActionResult, formData: FormData) => createAudit(formData),
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Titre de l&apos;audit</Label>
        <Input id="title" name="title" required maxLength={150} placeholder="Ex: Audit de conformité sécurité & environnement — Site Dakar Port" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="referenceFramework">Référentiel / Norme d&apos;audit</Label>
          <Input
            id="referenceFramework"
            name="referenceFramework"
            defaultValue="Système de Management QHSE - ISO 9001/45001/14001"
            placeholder="Ex: ISO 45001 §8.1.2 / Plan de Contrôle Chantier"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="siteId">Site concerné</Label>
          <Select id="siteId" name="siteId" defaultValue="">
            <option value="">Tous les sites / Transversal</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scope">Périmètre d&apos;audit</Label>
        <Textarea id="scope" name="scope" required rows={2} placeholder="Processus, installations, équipements ou activités audités" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="criteria">Critères & Exigences d&apos;évaluation</Label>
        <Textarea id="criteria" name="criteria" required rows={2} placeholder="Exigences légales, procédures internes, consignes de sécurité" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="auditorId">Auditeur responsable</Label>
          <Select id="auditorId" name="auditorId" required defaultValue="">
            <option value="" disabled>
              Sélectionner un auditeur…
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

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="startDate">Date début réalisation</Label>
          <Input id="startDate" name="startDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Date fin réalisation</Label>
          <Input id="endDate" name="endDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Statut initial</Label>
          <Select id="status" name="status" defaultValue="brouillon">
            <option value="brouillon">Brouillon</option>
            <option value="en_preparation">En préparation</option>
            <option value="en_cours">En cours</option>
          </Select>
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton>Créer & Initialiser l&apos;audit</SubmitButton>
    </form>
  );
}
