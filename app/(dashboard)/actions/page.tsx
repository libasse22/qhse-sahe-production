import Link from "next/link";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { listMyActions } from "@/lib/services/actions.service";
import { listActiveUsers } from "@/lib/services/users.service";
import { Card, CardContent } from "@/components/ui/card";
import { ActionStatusSelect } from "@/components/actions/action-status-select";
import { ActionStatusBadge, ActionPriorityBadge, ActionEfficiencyBadge } from "@/components/actions/action-status-badge";
import { ExportActionsCsvButton } from "@/components/actions/export-actions-csv-button";
import { ActionForm } from "@/components/actions/action-form";
import { ProofGallery } from "@/components/actions/proof-gallery";
import { ActionCommentsJournal } from "@/components/actions/action-comments-journal";
import { ActionHistoryTimeline } from "@/components/actions/action-history-timeline";
import { QHSE_DOMAIN_LABELS, CAPA_ACTION_TYPE_LABELS } from "@/lib/types/actions";

export default async function ActionsPage() {
  const [permissions, actions, assignableUsers] = await Promise.all([
    getCurrentPermissions(),
    listMyActions(),
    listActiveUsers(),
  ]);

  const canManageActions = permissions.has("actions.manage") || permissions.has("actions.create");

  return (
    <div className="space-y-8">
      {/* HEADER PAGE CAPA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">🛠️ Moteur CAPA & Actions QHSE</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {actions.length} Action(s)
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {canManageActions
              ? "Plan d'actions correctives, préventives et d'amélioration QHSE."
              : "Actions CAPA assignées nécessitant votre intervention."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportActionsCsvButton actions={actions} />
          {canManageActions && <ActionForm assignableUsers={assignableUsers} />}
        </div>
      </div>

      {actions.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <p className="font-semibold text-foreground text-base">Aucune action CAPA enregistrée</p>
            <p className="mt-1 text-xs">Utilisez le bouton ci-dessus pour déclencher une première action corrective ou préventive.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* LISTE DES ACTIONS SOUS FORME DE CARTE DÉTAILLÉE */}
          {actions.map((action) => (
            <Card key={action.id} className="border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-muted/20 pb-3 border-b border-border p-4 md:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-primary">{action.codeReference}</span>
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {CAPA_ACTION_TYPE_LABELS[action.typeAction] || action.typeAction}
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {QHSE_DOMAIN_LABELS[action.domaineQhse] || action.domaineQhse}
                    </span>
                    <ActionPriorityBadge priority={action.priorite} />
                  </div>

                  <div className="flex items-center gap-2">
                    <ActionStatusBadge action={action} />
                    {action.efficaciteStatut !== "non_evalue" && (
                      <ActionEfficiencyBadge status={action.efficaciteStatut} />
                    )}
                  </div>
                </div>

                <div className="pt-2 text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                  <span>
                    Origine :{" "}
                    {action.incidentId ? (
                      <Link href={`/incidents/${action.incidentId}`} className="font-medium text-primary hover:underline">
                        {action.sourceTitle}
                      </Link>
                    ) : action.inspectionRunId ? (
                      <Link href={`/inspections/${action.inspectionRunId}`} className="font-medium text-primary hover:underline">
                        {action.sourceTitle}
                      </Link>
                    ) : action.auditId ? (
                      <Link href={`/audits/${action.auditId}`} className="font-medium text-primary hover:underline">
                        {action.sourceTitle}
                      </Link>
                    ) : action.workPermitId ? (
                      <Link href={`/permis-de-travail/${action.workPermitId}`} className="font-medium text-primary hover:underline">
                        {action.sourceTitle}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{action.sourceTitle}</span>
                    )}
                  </span>
                  <span>•</span>
                  <span>Responsable : <strong className="text-foreground">{action.responsableName}</strong></span>
                  <span>•</span>
                  <span>Échéance : <strong className="font-mono text-foreground">{new Date(action.echeance).toLocaleDateString("fr-FR")}</strong></span>
                </div>
              </div>

              <CardContent className="p-4 md:p-6 space-y-5">
                {/* Description */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Description de l&apos;Action
                  </h4>
                  <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                    {action.description}
                  </p>
                </div>

                {/* Motif de blocage si bloquée */}
                {action.isBlocked && action.blockedReasonDetail && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <span>🔴 Action Bloquée [{action.blockedReasonCategory?.toUpperCase()}]</span>
                    </p>
                    <p>{action.blockedReasonDetail}</p>
                    {action.blockedByName && (
                      <p className="text-[10px] opacity-80 pt-0.5">Signalé par {action.blockedByName}</p>
                    )}
                  </div>
                )}

                {/* Analyse des causes si présente */}
                {(action.causeImmediate || action.causeRacine) && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1.5">
                    <h5 className="font-semibold text-foreground text-xs">🔍 Analyse des Causes</h5>
                    {action.causeImmediate && (
                      <p><span className="text-muted-foreground">Cause immédiate :</span> {action.causeImmediate}</p>
                    )}
                    {action.causeRacine && (
                      <p><span className="text-muted-foreground">Cause racine ({action.methodeAnalyse || "5 Pourquoi"}) :</span> <strong>{action.causeRacine}</strong></p>
                    )}
                  </div>
                )}

                {/* Sélecteur de statut & Contrôles */}
                <div className="pt-2 border-t border-border">
                  <ActionStatusSelect action={action} incidentId={action.incidentId ?? undefined} canManage={canManageActions} />
                </div>

                {/* Grille Galerie de preuves, Journal d'avancement et Timeline */}
                <div className="grid gap-4 pt-2 lg:grid-cols-2">
                  <ActionCommentsJournal actionId={action.id} />
                  <ActionHistoryTimeline actionId={action.id} />
                </div>

                {/* Preuves terrain rattachées */}
                <ProofGallery actionId={action.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
