import Link from "next/link";
import { CheckCircle2, Clock, Flame, AlertOctagon, AlertTriangle } from "lucide-react";
import { listIncidents } from "@/lib/services/incidents.service";
import { PendingDraftsList } from "@/components/ouvrier/pending-drafts-list";
import type { IncidentSeverity, IncidentStatus } from "@/lib/types/incidents";

const SEVERITY_ICON: Record<IncidentSeverity, { icon: typeof CheckCircle2; className: string }> = {
  faible: { icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700" },
  moyenne: { icon: AlertTriangle, className: "bg-amber-100 text-amber-700" },
  elevee: { icon: AlertOctagon, className: "bg-orange-100 text-orange-700" },
  critique: { icon: Flame, className: "bg-red-100 text-red-700" },
};

const STATUS_LABEL_SIMPLE: Record<IncidentStatus, string> = {
  declare: "Envoyé",
  en_cours: "Pris en charge",
  resolu: "Résolu",
  cloture: "Terminé",
};

export default async function MesDeclarationsPage() {
  const incidents = await listIncidents();

  return (
    <div className="space-y-4">
      <h1 className="text-center text-2xl font-bold">Mes signalements</h1>

      <PendingDraftsList />

      {incidents.length === 0 ? (
        <p className="text-center text-lg text-muted-foreground">
          Tu n&apos;as encore rien signalé.
        </p>
      ) : (
        <ul className="space-y-3">
          {incidents.map((incident) => {
            const { icon: Icon, className } = SEVERITY_ICON[incident.severity];
            return (
              <li key={incident.id}>
                <Link
                  href={`/ouvrier/incidents/${incident.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${className}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{incident.location || "Lieu non précisé"}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(incident.occurredAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    {STATUS_LABEL_SIMPLE[incident.status]}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
