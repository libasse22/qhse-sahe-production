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
  inspectionRunId,
  auditId,
  riskId,
  workPermitId,
  parentActionId,
  assignableUsers,
}: {
  incidentId?: string;
  inspectionRunId?: string;
  auditId?: string;
  riskId?: string;
  workPermitId?: string;
  parentActionId?: string;
  assignableUsers: Profile[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createAction(
        { incidentId, inspectionRunId, auditId, riskId, workPermitId, parentActionId },
        formData,
      );
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        setShowAnalysis(false);
      }
    });
  }

  if (!open) {
    return (
      <Button size="sm" variant="default" onClick={() => setOpen(true)} className="gap-1.5 font-medium">
        <span>+ Nouvelle Action CAPA</span>
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-semibold text-foreground text-base">🛠️ Créer une Action CAPA</h3>
        {parentActionId && (
          <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            Action Fille (Récidive)
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="typeAction">Type d&apos;action</Label>
          <Select id="typeAction" name="typeAction" defaultValue="corrective">
            <option value="corrective">Action Corrective</option>
            <option value="preventive">Action Préventive</option>
            <option value="amelioration">Opportunité d&apos;Amélioration</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="domaineQhse">Domaine QHSE</Label>
          <Select id="domaineQhse" name="domaineQhse" defaultValue="securite">
            <option value="securite">Sécurité (SST)</option>
            <option value="qualite">Qualité (SMQ)</option>
            <option value="environnement">Environnement (SME)</option>
            <option value="hygiene">Hygiène (HSE)</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="priorite">Priorité</Label>
          <Select id="priorite" name="priorite" defaultValue="moyenne">
            <option value="faible">Faible</option>
            <option value="moyenne">Moyenne</option>
            <option value="elevee">Élevée</option>
            <option value="critique">Critique</option>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description claire de l&apos;action</Label>
        <Textarea
          id="description"
          name="description"
          required
          rows={3}
          placeholder="Décris précisemment l'action à réaliser..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="responsableId">Responsable assigné</Label>
          <Select id="responsableId" name="responsableId" required defaultValue="">
            <option value="" disabled>
              Sélectionner le responsable…
            </option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName || u.email}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="echeance">Échéance limite</Label>
          <Input id="echeance" name="echeance" type="date" required />
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAnalysis(!showAnalysis)}
          className="text-xs font-semibold text-primary underline underline-offset-4 hover:text-primary/80"
        >
          {showAnalysis ? "— Masquer l'analyse des causes" : "+ Ajouter une analyse des causes racine (Optionnel)"}
        </button>
      </div>

      {showAnalysis && (
        <div className="space-y-3 rounded-lg border border-border/80 bg-muted/30 p-3.5 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="causeImmediate" className="text-xs">
                Cause immédiate / constat
              </Label>
              <Input id="causeImmediate" name="causeImmediate" placeholder="Qu'est-ce qui a déclenché l'anomalie ?" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="methodeAnalyse" className="text-xs">
                Méthode d&apos;analyse
              </Label>
              <Select id="methodeAnalyse" name="methodeAnalyse" defaultValue="5_pourquoi">
                <option value="5_pourquoi">5 Pourquoi</option>
                <option value="ishikawa">Diagramme d&apos;Ishikawa</option>
                <option value="arbre_des_causes">Arbre des causes</option>
                <option value="autre">Autre méthode</option>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="causeRacine" className="text-xs">
              Cause racine validée
            </Label>
            <Textarea
              id="causeRacine"
              name="causeRacine"
              rows={2}
              placeholder="Cause profonde identifiée après analyse..."
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Enregistrement en cours…" : "Créer l'action CAPA"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setShowAnalysis(false);
          }}
          disabled={isPending}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
