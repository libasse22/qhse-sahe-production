import Link from "next/link";
import { listWorkPermits } from "@/lib/services/permits.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermitStatusBadge } from "@/components/permits/permit-status-badge";
import { PERMIT_TYPE_LABELS } from "@/lib/types/permits";
import { FileCheck, Plus, MapPin, Calendar, Clock } from "lucide-react";

export default async function WorkPermitsPage() {
  const permits = await listWorkPermits();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-primary" />
            Permis de Travail (Control of Work)
          </h1>
          <p className="text-sm text-muted-foreground">
            Autorisations et vérifications préalables des interventions à haut risque.
          </p>
        </div>
        <Link href="/permis-de-travail/nouveau">
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" /> Demander un permis
          </Button>
        </Link>
      </div>

      {permits.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <FileCheck className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            Aucun permis de travail enregistré pour le moment.
            <div className="mt-4">
              <Link href="/permis-de-travail/nouveau">
                <Button variant="outline" size="sm">
                  Créer une première demande
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {permits.map((permit) => (
            <Card key={permit.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-semibold text-primary">
                      {permit.reference}
                    </span>
                    <h2 className="font-semibold text-base leading-snug line-clamp-1 mt-0.5">
                      <Link href={`/permis-de-travail/${permit.id}`} className="hover:underline">
                        {permit.title}
                      </Link>
                    </h2>
                  </div>
                  <PermitStatusBadge status={permit.status} />
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground">Type :</span>
                    <span>{PERMIT_TYPE_LABELS[permit.permitType] || permit.permitType}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{permit.location || "Lieu non précisé"}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {new Date(permit.startTime).toLocaleDateString("fr-FR")} →{" "}
                      {new Date(permit.endTime).toLocaleDateString("fr-FR")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>Demandé par : {permit.applicantName}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-border text-xs">
                  <span className="text-muted-foreground">
                    {permit.safetyMeasures.filter((m) => m.checked).length} / {permit.safetyMeasures.length} mesures validées
                  </span>
                  <Link
                    href={`/permis-de-travail/${permit.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    Voir le permis →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
