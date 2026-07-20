"use client";

import { useEffect, useState } from "react";
import { CloudOff, CheckCircle2, AlertTriangle, AlertOctagon, Flame, RefreshCw } from "lucide-react";
import { getAllDrafts } from "@/lib/offline/db";
import { onQueueChanged, syncAll } from "@/lib/offline/sync-manager";
import type { PendingIncident } from "@/lib/offline/types";
import type { IncidentSeverity } from "@/lib/types/incidents";

const SEVERITY_ICON: Record<IncidentSeverity, { icon: typeof CheckCircle2; className: string }> = {
  faible: { icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700" },
  moyenne: { icon: AlertTriangle, className: "bg-amber-100 text-amber-700" },
  elevee: { icon: AlertOctagon, className: "bg-orange-100 text-orange-700" },
  critique: { icon: Flame, className: "bg-red-100 text-red-700" },
};

export function PendingDraftsList() {
  const [drafts, setDrafts] = useState<PendingIncident[]>([]);

  useEffect(() => {
    function refresh() {
      getAllDrafts().then(setDrafts).catch(() => setDrafts([]));
    }
    refresh();
    return onQueueChanged(refresh);
  }, []);

  if (drafts.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted-foreground">En attente d&apos;envoi</p>
        <button
          type="button"
          onClick={() => syncAll()}
          className="flex items-center gap-1 text-xs font-medium text-primary"
        >
          <RefreshCw className="h-3 w-3" />
          Réessayer
        </button>
      </div>
      <ul className="space-y-3">
        {drafts.map((draft) => {
          const { icon: Icon, className } = SEVERITY_ICON[draft.severity];
          return (
            <li
              key={draft.clientGeneratedId}
              className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-border bg-card/60 p-4"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${className}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{draft.location || "Lieu non précisé"}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(draft.createdAt).toLocaleDateString("fr-FR")}
                  {draft.photos.length > 0 && ` · ${draft.photos.length} photo(s)`}
                  {draft.voiceNotes.length > 0 && " · vocal"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm font-medium">
                <CloudOff className="h-4 w-4" />
                {draft.status === "syncing" ? "Envoi…" : "En attente"}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
