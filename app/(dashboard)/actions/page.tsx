import Link from "next/link";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { listMyActions } from "@/lib/services/actions.service";
import { Card, CardContent } from "@/components/ui/card";
import { ActionStatusSelect } from "@/components/actions/action-status-select";
import { ActionStatusBadge } from "@/components/actions/action-status-badge";
import { ExportActionsCsvButton } from "@/components/actions/export-actions-csv-button";

export default async function ActionsPage() {
  const permissions = await getCurrentPermissions();
  const actions = await listMyActions();
  const canManageActions = permissions.has("actions.manage");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Actions correctives</h1>
          <p className="text-muted-foreground">
            {canManageActions
              ? "Toutes les actions correctives de l'organisation."
              : "Les actions correctives dont vous êtes responsable."}
          </p>
        </div>
        <ExportActionsCsvButton actions={actions} />
      </div>

      {actions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Aucune action corrective pour le moment.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Incident</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                  <th className="px-6 py-3 font-medium">Responsable</th>
                  <th className="px-6 py-3 font-medium">Échéance</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                  <th className="px-6 py-3 font-medium">Mettre à jour</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => (
                  <tr key={action.id} className="border-b border-border last:border-0">
                    <td className="px-6 py-3">
                      <Link href={`/incidents/${action.incidentId}`} className="font-medium hover:underline">
                        {action.incidentTitle}
                      </Link>
                    </td>
                    <td className="px-6 py-3">{action.description}</td>
                    <td className="px-6 py-3 text-muted-foreground">{action.responsableName}</td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {new Date(action.echeance).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-3">
                      <ActionStatusBadge action={action} />
                    </td>
                    <td className="px-6 py-3">
                      <div className="w-40">
                        <ActionStatusSelect actionId={action.id} incidentId={action.incidentId} status={action.status} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
