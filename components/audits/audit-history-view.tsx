"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import type { AuditHistoryEvent } from "@/lib/types/audit";

const EVENT_TYPE_LABELS: Record<AuditHistoryEvent["eventType"], string> = {
  audit_created: "Audit créé",
  status_updated: "Statut mis à jour",
  item_added: "Point d'audit ajouté",
  item_status_updated: "Évaluation du point modifiée",
  proof_linked: "Preuve rattachée",
  proof_unlinked: "Preuve retirée",
  capa_created: "CAPA générée",
  audit_closed: "Audit clôturé",
};

const EVENT_TYPE_BADGES: Record<AuditHistoryEvent["eventType"], "outline" | "success" | "warning" | "destructive" | "secondary"> = {
  audit_created: "outline",
  status_updated: "secondary",
  item_added: "outline",
  item_status_updated: "warning",
  proof_linked: "success",
  proof_unlinked: "destructive",
  capa_created: "warning",
  audit_closed: "success",
};

export function AuditHistoryView({ history }: { history: AuditHistoryEvent[] }) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Journal d'Historique Append-Only ({history.length})</CardTitle>
        <CardDescription>
          Traçabilité inaltérable de toutes les actions et modifications effectuées sur cet audit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4 text-center">
            Aucun événement consigné dans le journal.
          </p>
        ) : (
          <div className="relative pl-6 space-y-4 border-l-2 border-border/60">
            {history.map((h) => (
              <div key={h.id} className="relative text-xs space-y-1">
                <span className="absolute -left-[31px] top-0 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />

                <div className="flex items-center gap-2">
                  <Badge variant={EVENT_TYPE_BADGES[h.eventType]}>
                    {EVENT_TYPE_LABELS[h.eventType] || h.eventType}
                  </Badge>
                  <span className="font-semibold text-foreground">{h.actorName}</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(h.createdAt).toLocaleString("fr-FR")}
                  </span>
                </div>

                {h.comment && <p className="text-muted-foreground bg-accent/30 p-2 rounded">{h.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
