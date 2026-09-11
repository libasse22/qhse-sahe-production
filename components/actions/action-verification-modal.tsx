"use client";

import { useState, useTransition } from "react";
import { verifyActionEfficiency } from "@/lib/services/actions.service";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type EvaluatedEfficiency = "efficace" | "partiellement_efficace" | "inefficace";

export function ActionVerificationModal({
  actionId,
  codeReference,
  onClose,
}: {
  actionId: string;
  codeReference: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [efficaciteStatut, setEfficaciteStatut] = useState<EvaluatedEfficiency>("efficace");
  const [commentaire, setCommentaire] = useState("");
  const [createChild, setCreateChild] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await verifyActionEfficiency(actionId, {
        efficaciteStatut,
        commentaireEfficacite: commentaire,
        createChildAction: createChild,
      });

      if (res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-lg font-semibold text-foreground">
            🎯 Évaluation d&apos;efficacité & Clôture ({codeReference})
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground font-bold">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="efficaciteStatut">Résultat de l&apos;évaluation d&apos;efficacité</Label>
            <Select
              id="efficaciteStatut"
              value={efficaciteStatut}
              onChange={(e) => setEfficaciteStatut(e.target.value as EvaluatedEfficiency)}
            >
              <option value="efficace">✅ Efficace (Problème résolu durablement)</option>
              <option value="partiellement_efficace">⚠️ Partiellement Efficace (Résultat acceptable)</option>
              <option value="inefficace">❌ Inefficace (Pas d&apos;amélioration constatée)</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="commentaire">Commentaire justificatif du vérificateur</Label>
            <Textarea
              id="commentaire"
              required
              rows={3}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Constatations du contrôle d'efficacité, mesures observées sur le terrain..."
            />
          </div>

          {efficaciteStatut === "inefficace" && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs space-y-2 text-destructive">
              <p className="font-semibold">⚠️ Attention : Une action inefficace ne peut pas être clôturée.</p>
              <p>L&apos;action repassera en cours de traitement pour révision.</p>
              <label className="flex items-center gap-2 cursor-pointer pt-1 font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={createChild}
                  onChange={(e) => setCreateChild(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>Créer automatiquement une nouvelle action CAPA fille (Récidive)</span>
              </label>
            </div>
          )}

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" variant="default" disabled={isPending}>
              {isPending ? "Validation..." : "Valider l'évaluation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
