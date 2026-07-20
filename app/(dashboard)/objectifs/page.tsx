import { listObjectives } from "@/lib/services/objectives.service";
import { listActiveUsers } from "@/lib/services/users.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ObjectiveForm } from "@/components/objectives/objective-form";
import { ProgressUpdate } from "@/components/objectives/progress-update";
import { OBJECTIVE_STATUS_LABELS, OBJECTIVE_STATUS_BADGE, objectiveProgress } from "@/lib/types/objective";

export default async function ObjectifsPage() {
  const permissions = await getCurrentPermissions();
  const canManageObjectives = permissions.has("objectives.manage");

  const [objectives, assignableUsers] = await Promise.all([
    listObjectives(),
    canManageObjectives ? listActiveUsers() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Objectifs & indicateurs QHSE</h1>
        <p className="text-muted-foreground">ISO 9001 §6.2 / 14001 §6.2 / 45001 §6.2 — objectifs mesurables et suivi d&apos;avancement.</p>
      </div>

      {canManageObjectives && <ObjectiveForm assignableUsers={assignableUsers} />}

      {objectives.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Aucun objectif défini pour le moment.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {objectives.map((o) => {
            const progress = objectiveProgress(o);
            return (
              <Card key={o.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{o.title}</CardTitle>
                    <Badge variant={OBJECTIVE_STATUS_BADGE[o.status]}>{OBJECTIVE_STATUS_LABELS[o.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {o.description && <p className="text-sm text-muted-foreground">{o.description}</p>}
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>
                        {o.currentValue} / {o.targetValue} {o.unit}
                      </span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${progress >= 100 ? "bg-emerald-500" : "bg-primary"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Échéance : {new Date(o.deadline).toLocaleDateString("fr-FR")}
                    {o.ownerName ? ` · Responsable : ${o.ownerName}` : ""}
                  </p>
                  {canManageObjectives && <ProgressUpdate objectiveId={o.id} currentValue={o.currentValue} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
