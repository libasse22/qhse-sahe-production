import Link from "next/link";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { listMyActions } from "@/lib/services/actions.service";
import { Card, CardContent } from "@/components/ui/card";
import { ActionStatusSelect } from "@/components/actions/action-status-select";
import { ActionStatusBadge } from "@/components/actions/action-status-badge";
import { ExportActionsCsvButton } from "@/components/actions/export-actions-csv-button";
import { ProofGallery } from "@/components/actions/proof-gallery";

export default async function ActionsPage() {
  const permissions = await getCurrentPermissions();
  const actions = await listMyActions();
  const canManageActions = permissions.has("actions.manage");

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Actions correctives</h1>
          <p className="text-sm text-muted-foreground">
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
        <div className="space-y-6">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted-foreground bg-muted/30">
                      <th className="px-6 py-3 font-medium">Incident / Origine</th>
                      <th className="px-6 py-3 font-medium">Description de l&apos;action</th>
                      <th className="px-6 py-3 font-medium">Responsable</th>
                      <th className="px-6 py-3 font-medium">Échéance</th>
                      <th className="px-6 py-3 font-medium">Statut</th>
                      <th className="px-6 py-3 font-medium">Mettre à jour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actions.map((action) => (
                      <tr key={action.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-6 py-3">
                          <div className="space-y-1">
                            {action.incidentId ? (
                              <Link href={`/incidents/${action.incidentId}`} className="font-medium text-primary hover:underline block">
                                {action.sourceTitle}
                              </Link>
                            ) : action.inspectionRunId ? (
                              <Link href={`/inspections/${action.inspectionRunId}`} className="font-medium text-primary hover:underline block">
                                {action.sourceTitle}
                              </Link>
                            ) : action.auditId ? (
                              <Link href={`/audits/${action.auditId}`} className="font-medium text-primary hover:underline block">
                                {action.sourceTitle}
                              </Link>
                            ) : action.riskId ? (
                              <Link href={`/risques`} className="font-medium text-primary hover:underline block">
                                {action.sourceTitle}
                              </Link>
                            ) : (
                              <span className="font-medium text-muted-foreground">{action.sourceTitle}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 font-medium">{action.description}</td>
                        <td className="px-6 py-3 text-muted-foreground">{action.responsableName}</td>
                        <td className="px-6 py-3 text-muted-foreground font-mono text-xs">
                          {new Date(action.echeance).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-6 py-3">
                          <ActionStatusBadge action={action} />
                        </td>
                        <td className="px-6 py-3">
                          <div className="w-40">
                            <ActionStatusSelect actionId={action.id} incidentId={action.incidentId ?? ""} status={action.status} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* GALERIE DE PREUVES TERRAIN (AVANT / PENDANT / APRÈS) */}
          <ProofGallery />
        </div>
      )}
    </div>
  );
}
