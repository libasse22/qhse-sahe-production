"use client";

import { useState, useTransition } from "react";
import { blockAction, unblockAction } from "@/lib/services/actions.service";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionBlockCategory } from "@/lib/types/actions";

export function ActionBlockModal({
  actionId,
  isBlocked,
  onClose,
}: {
  actionId: string;
  isBlocked: boolean;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<ActionBlockCategory>("technique");
  const [detail, setDetail] = useState("");
  const [unblockComment, setUnblockComment] = useState("");

  function handleBlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await blockAction(actionId, {
        reasonCategory: category,
        reasonDetail: detail,
      });
      if (res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    });
  }

  function handleUnblock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await unblockAction(actionId, unblockComment);
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
            {isBlocked ? "🟢 Lever le blocage CAPA" : "🔴 Déclarer un blocage sur l'action"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground font-bold">
            ✕
          </button>
        </div>

        {!isBlocked ? (
          <form onSubmit={handleBlock} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="category">Catégorie du motif de blocage</Label>
              <Select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ActionBlockCategory)}
              >
                <option value="ressources">Manque de ressources humaines</option>
                <option value="budget">Contrainte budgétaire</option>
                <option value="fournisseur">Retard / Défaillance fournisseur</option>
                <option value="dependance">Dépendance à une autre action</option>
                <option value="validation_management">En attente de décision de la Direction</option>
                <option value="technique">Complexité / Obstacle technique</option>
                <option value="autre">Autre motif</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="detail">Explication détaillée du blocage</Label>
              <Textarea
                id="detail"
                required
                rows={3}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Décris l'obstacle rencontré et les actions nécessaires pour débloquer..."
              />
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                {isPending ? "Enregistrement…" : "Confirmer le blocage"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleUnblock} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="unblockComment">Commentaire de déblocage / solution apportée</Label>
              <Textarea
                id="unblockComment"
                rows={3}
                value={unblockComment}
                onChange={(e) => setUnblockComment(e.target.value)}
                placeholder="Précise ce qui a permis de résoudre le blocage (ex: pièces reçues, validation obtenue)..."
              />
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit" variant="default" disabled={isPending}>
                {isPending ? "Déblocage en cours…" : "Lever le blocage"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
