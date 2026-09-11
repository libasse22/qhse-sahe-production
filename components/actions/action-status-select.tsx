"use client";

import { useState, useTransition } from "react";
import { updateActionStatus } from "@/lib/services/actions.service";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ActionBlockModal } from "@/components/actions/action-block-modal";
import { ActionVerificationModal } from "@/components/actions/action-verification-modal";
import type { ActionStatus, ActionCorrective } from "@/lib/types/actions";

export function ActionStatusSelect({
  action,
  incidentId,
  canManage,
}: {
  action: ActionCorrective;
  incidentId?: string;
  canManage?: boolean;
}) {
  const [status, setStatus] = useState<ActionStatus>(action.status);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [motifInput, setMotifInput] = useState("");

  const isClosedOrRejected = status === "cloturee" || status === "rejetee";

  function handleStatusChange(target: ActionStatus) {
    setError(null);

    if (target === "bloquee") {
      setShowBlockModal(true);
      return;
    }

    if (target === "cloturee") {
      setShowVerifyModal(true);
      return;
    }

    if (target === "rejetee") {
      setShowRejectModal(true);
      return;
    }

    if (target === "reouverte") {
      setShowReopenModal(true);
      return;
    }

    // Direct status change
    setStatus(target);
    startTransition(async () => {
      const res = await updateActionStatus(action.id, incidentId, target);
      if (res.error) {
        setError(res.error);
        setStatus(action.status);
      }
    });
  }

  function handleConfirmReject() {
    if (!motifInput.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await updateActionStatus(action.id, incidentId, "rejetee", motifInput);
      if (res.error) {
        setError(res.error);
      } else {
        setShowRejectModal(false);
        setStatus("rejetee");
      }
    });
  }

  function handleConfirmReopen() {
    if (!motifInput.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await updateActionStatus(action.id, incidentId, "reouverte", motifInput);
      if (res.error) {
        setError(res.error);
      } else {
        setShowReopenModal(false);
        setStatus("en_cours");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as ActionStatus)}
          disabled={isPending || (isClosedOrRejected && !canManage)}
          className="h-9 w-auto text-xs font-medium"
        >
          <option value="ouverte">Ouverte</option>
          <option value="en_cours">En cours</option>
          <option value="a_verifier">À vérifier (Soumettre)</option>
          <option value="bloquee">🔴 Bloquée (Déclarer blocage)</option>
          <option value="cloturee">🎯 Clôturée (Évaluer efficacité)</option>
          <option value="rejetee">❌ Rejetée</option>
          {isClosedOrRejected && <option value="reouverte">🔄 Réouvrir la CAPA</option>}
        </Select>

        {action.isBlocked ? (
          <Button size="sm" variant="outline" className="h-9 text-xs font-semibold" onClick={() => setShowBlockModal(true)}>
            🟢 Lever le blocage
          </Button>
        ) : (
          <Button size="sm" variant="ghost" className="h-9 text-xs text-muted-foreground" onClick={() => setShowBlockModal(true)}>
            🔴 Déclarer blocage
          </Button>
        )}

        {status === "a_verifier" && (
          <Button
            size="sm"
            variant="default"
            className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setShowVerifyModal(true)}
          >
            🎯 Vérifier l&apos;efficacité
          </Button>
        )}
      </div>

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      {/* Modale de blocage */}
      {showBlockModal && (
        <ActionBlockModal
          actionId={action.id}
          isBlocked={action.isBlocked}
          onClose={() => setShowBlockModal(false)}
        />
      )}

      {/* Modale d'efficacité */}
      {showVerifyModal && (
        <ActionVerificationModal
          actionId={action.id}
          codeReference={action.codeReference}
          onClose={() => setShowVerifyModal(false)}
        />
      )}

      {/* Modale de Rejet */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl space-y-4">
            <h3 className="font-semibold text-destructive">❌ Rejeter l&apos;action CAPA ({action.codeReference})</h3>
            <p className="text-xs text-muted-foreground">Précise le motif explicite du rejet de l&apos;action :</p>
            <textarea
              rows={3}
              value={motifInput}
              onChange={(e) => setMotifInput(e.target.value)}
              className="w-full rounded-md border border-border bg-background p-2 text-xs text-foreground focus:ring-primary"
              placeholder="Motif du rejet..."
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowRejectModal(false)}>
                Annuler
              </Button>
              <Button size="sm" variant="destructive" onClick={handleConfirmReject} disabled={isPending}>
                Confirmer le rejet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de Réouverture */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl space-y-4">
            <h3 className="font-semibold text-foreground">🔄 Réouvrir l&apos;action CAPA ({action.codeReference})</h3>
            <p className="text-xs text-muted-foreground">Précise le motif de réouverture de cette action :</p>
            <textarea
              rows={3}
              value={motifInput}
              onChange={(e) => setMotifInput(e.target.value)}
              className="w-full rounded-md border border-border bg-background p-2 text-xs text-foreground focus:ring-primary"
              placeholder="Motif de réouverture (ex: récidive constatée, complément requis)..."
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowReopenModal(false)}>
                Annuler
              </Button>
              <Button size="sm" variant="default" onClick={handleConfirmReopen} disabled={isPending}>
                Réouvrir la CAPA
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
