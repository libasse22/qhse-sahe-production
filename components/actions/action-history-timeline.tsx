"use client";

import { useState, useEffect } from "react";
import { listActionHistory } from "@/lib/services/actions.service";
import type { ActionHistoryEvent } from "@/lib/types/actions";

const EVENT_LABELS: Record<string, string> = {
  creation: "Création initiale de l'action CAPA",
  status_changed: "Changement de statut",
  reassigned: "Réassignation du responsable",
  priority_changed: "Changement de priorité",
  deadline_changed: "Modification de l'échéance",
  deadline_extended: "Prolongation d'échéance accordée",
  blocked: "Déclaration d'un blocage métier",
  unblocked: "Levée du blocage métier",
  comment_added: "Ajout d'une note d'avancement",
  proof_added: "Ajout d'une preuve justificative",
  proof_removed: "Suppression d'une preuve",
  verification_requested: "Soumission pour vérification",
  efficiency_verified: "Évaluation de l'efficacité",
  rejected: "Rejet de la CAPA",
  closed: "Clôture définitive",
  reopened: "Réouverture officielle de la CAPA",
};

export function ActionHistoryTimeline({ actionId }: { actionId: string }) {
  const [history, setHistory] = useState<ActionHistoryEvent[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && history.length === 0) {
      listActionHistory(actionId).then(setHistory);
    }
  }, [actionId, open, history.length]);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
          <span>📜 Audit Log immuable (Traçabilité)</span>
        </h4>
        <button
          onClick={() => setOpen(!open)}
          className="text-xs font-semibold text-primary underline underline-offset-4 hover:text-primary/80"
        >
          {open ? "Masquer la timeline" : "Afficher l'historique d'audit"}
        </button>
      </div>

      {open && (
        <div className="space-y-3 pt-2">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Chargement du journal d&apos;audit...</p>
          ) : (
            <div className="relative border-l-2 border-border ml-2 pl-4 space-y-4 text-xs">
              {history.map((ev) => (
                <div key={ev.id} className="relative group">
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-semibold text-foreground">{ev.actorName}</span>
                    <span>{new Date(ev.createdAt).toLocaleString("fr-FR")}</span>
                  </div>
                  <p className="font-medium text-foreground mt-0.5">
                    {EVENT_LABELS[ev.eventType] || ev.eventType}
                  </p>
                  {ev.comment && <p className="text-muted-foreground mt-0.5 italic">&quot;{ev.comment}&quot;</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
