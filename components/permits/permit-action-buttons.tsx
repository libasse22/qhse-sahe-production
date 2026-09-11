"use client";

import { useState, useTransition } from "react";
import { updateWorkPermitStatus, suspendWorkPermit, resumeWorkPermit } from "@/lib/services/permits.service";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { WorkPermitStatus } from "@/lib/types/permits";
import { CheckCircle2, XCircle, PlayCircle, Archive, AlertTriangle, PauseCircle } from "lucide-react";

export function PermitActionButtons({
  permitId,
  currentStatus,
  canManage,
}: {
  permitId: string;
  currentStatus: WorkPermitStatus;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [suspensionReason, setSuspensionReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleStatusChange(targetStatus: WorkPermitStatus, reason?: string) {
    setError(null);
    startTransition(async () => {
      const res = await updateWorkPermitStatus(permitId, targetStatus, reason);
      if (res.error) {
        setError(res.error);
      } else {
        setShowRejectForm(false);
      }
    });
  }

  function handleSuspend() {
    if (!suspensionReason.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await suspendWorkPermit(permitId, suspensionReason);
      if (res.error) {
        setError(res.error);
      } else {
        setShowSuspendForm(false);
        setSuspensionReason("");
      }
    });
  }

  function handleResume() {
    setError(null);
    startTransition(async () => {
      const res = await resumeWorkPermit(permitId);
      if (res.error) {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {/* Actions si en attente et l'utilisateur est manager QHSE / Admin */}
        {currentStatus === "en_attente" && canManage && (
          <>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isPending}
              onClick={() => handleStatusChange("approuve")}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approuver le Permis
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isPending}
              onClick={() => setShowRejectForm(!showRejectForm)}
            >
              <XCircle className="mr-1.5 h-4 w-4" /> Refuser
            </Button>
          </>
        )}

        {/* Démarrage du chantier si permis approuvé */}
        {currentStatus === "approuve" && (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isPending}
            onClick={() => handleStatusChange("en_cours")}
          >
            <PlayCircle className="mr-1.5 h-4 w-4" /> Démarrer les travaux
          </Button>
        )}

        {/* Bouton de suspension si travaux en cours */}
        {currentStatus === "en_cours" && canManage && (
          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => setShowSuspendForm(!showSuspendForm)}
          >
            <PauseCircle className="mr-1.5 h-4 w-4" /> Suspendre les travaux
          </Button>
        )}

        {/* Bouton de reprise des travaux si suspendu */}
        {currentStatus === "suspendu" && canManage && (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isPending}
            onClick={handleResume}
          >
            <PlayCircle className="mr-1.5 h-4 w-4" /> Lever la suspension (Reprise)
          </Button>
        )}

        {/* Clôture des travaux si en cours ou suspendu */}
        {(currentStatus === "en_cours" || currentStatus === "approuve" || currentStatus === "suspendu") && canManage && (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => handleStatusChange("cloture")}
          >
            <Archive className="mr-1.5 h-4 w-4" /> Clôturer l&apos;intervention
          </Button>
        )}

        {/* Annulation si brouillon ou en attente */}
        {(currentStatus === "brouillon" || currentStatus === "en_attente") && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            disabled={isPending}
            onClick={() => handleStatusChange("annule")}
          >
            <AlertTriangle className="mr-1.5 h-4 w-4" /> Annuler
          </Button>
        )}
      </div>

      {showRejectForm && (
        <div className="mt-3 space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <label htmlFor="rejectionReason" className="text-xs font-medium text-destructive">
            Motif du refus du permis :
          </label>
          <Textarea
            id="rejectionReason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Expliciter les consignes non respectées ou risques non maîtrisés..."
            rows={2}
            className="text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowRejectForm(false)}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isPending || !rejectionReason.trim()}
              onClick={() => handleStatusChange("refuse", rejectionReason)}
            >
              Confirmer le Refus
            </Button>
          </div>
        </div>
      )}

      {showSuspendForm && (
        <div className="mt-3 space-y-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
          <label htmlFor="suspensionReason" className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Motif de la suspension d&apos;urgence (météo, fuite, danger imminent...) :
          </label>
          <Textarea
            id="suspensionReason"
            value={suspensionReason}
            onChange={(e) => setSuspensionReason(e.target.value)}
            placeholder="Préciser l'événement ou le risque ayant imposé l'arrêt temporaire..."
            rows={2}
            className="text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSuspendForm(false)}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isPending || !suspensionReason.trim()}
              onClick={handleSuspend}
            >
              Confirmer la Suspension
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
