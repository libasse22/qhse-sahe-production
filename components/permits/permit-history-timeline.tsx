import type { WorkPermitHistoryEvent } from "@/lib/types/permits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, ShieldCheck, PauseCircle, PlayCircle, XCircle, CheckCircle2, FileText } from "lucide-react";

export function PermitHistoryTimeline({
  historyEvents,
}: {
  historyEvents: WorkPermitHistoryEvent[];
}) {
  if (historyEvents.length === 0) return null;

  function getEventIcon(eventType: string) {
    if (eventType.includes("creation")) return <FileText className="h-3.5 w-3.5 text-blue-500" />;
    if (eventType.includes("suspended")) return <PauseCircle className="h-3.5 w-3.5 text-amber-500" />;
    if (eventType.includes("resumed")) return <PlayCircle className="h-3.5 w-3.5 text-emerald-500" />;
    if (eventType.includes("refuse") || eventType.includes("cancelled")) return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    if (eventType.includes("approuve")) return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
    return <ShieldCheck className="h-3.5 w-3.5 text-primary" />;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Journal d&apos;Audit & Traçabilité PtW ({historyEvents.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-4 space-y-4 border-l border-border/60 text-xs">
          {historyEvents.map((event) => (
            <div key={event.id} className="relative group">
              {/* Dot icon */}
              <div className="absolute -left-[21px] top-0.5 p-0.5 rounded-full bg-background border border-border">
                {getEventIcon(event.eventType)}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{event.actorName}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {new Date(event.createdAt).toLocaleString("fr-FR")}
                  </span>
                </div>

                {event.comment && (
                  <p className="text-muted-foreground bg-muted/20 p-2 rounded border border-border text-[11px] leading-relaxed">
                    {event.comment}
                  </p>
                )}

                {event.newStatus && (
                  <div className="text-[11px] text-muted-foreground">
                    Changement de statut :{" "}
                    <span className="font-mono font-medium text-foreground">
                      {event.oldStatus || "—"} → {event.newStatus}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
