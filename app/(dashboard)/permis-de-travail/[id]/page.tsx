import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkPermitById, listWorkPermitWorkers, listWorkPermitHistory } from "@/lib/services/permits.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { listActiveUsers } from "@/lib/services/users.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermitStatusBadge } from "@/components/permits/permit-status-badge";
import { PermitActionButtons } from "@/components/permits/permit-action-buttons";
import { PermitWorkersCard } from "@/components/permits/permit-workers-card";
import { PermitHistoryTimeline } from "@/components/permits/permit-history-timeline";
import { ProofGallery } from "@/components/actions/proof-gallery";
import { QrCode } from "@/components/equipment/qr-code";
import { ActionForm } from "@/components/actions/action-form";
import { PERMIT_TYPE_LABELS } from "@/lib/types/permits";
import {
  FileCheck,
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PauseCircle,
  Printer,
  QrCode as QrIcon,
} from "lucide-react";

export default async function WorkPermitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const permit = await getWorkPermitById(id);

  if (!permit) {
    notFound();
  }

  const permissions = await getCurrentPermissions();
  const canManage = permissions.has("permits.approve") || permissions.has("actions.manage");

  const [workers, historyEvents, assignableUsers] = await Promise.all([
    listWorkPermitWorkers(id),
    listWorkPermitHistory(id),
    canManage ? listActiveUsers() : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/permis-de-travail">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-primary">
                {permit.reference}
              </span>
              <PermitStatusBadge status={permit.status} />
            </div>
            <h1 className="text-xl font-bold tracking-tight mt-0.5">{permit.title}</h1>
          </div>
        </div>

        {/* WORKFLOW & PRINT BUTTONS */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/permis-de-travail/${permit.id}/impression`}>
            <Button size="sm" variant="outline">
              <Printer className="h-4 w-4 mr-1.5" /> Fiche Imprimable / PDF
            </Button>
          </Link>
          <PermitActionButtons
            permitId={permit.id}
            currentStatus={permit.status}
            canManage={canManage}
          />
        </div>
      </div>

      {/* BANNIÈRE DE SUSPENSION D'URGENCE */}
      {permit.status === "suspendu" && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 flex items-start gap-3 text-amber-800 dark:text-amber-300">
          <PauseCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <div className="space-y-1">
            <h2 className="font-bold text-sm">Intervention Suspendue d&apos;Urgence</h2>
            <p className="text-xs leading-relaxed">
              Motif de suspension : <span className="font-medium">{permit.suspensionReason || "Non précisé"}</span>
            </p>
            {permit.suspendedAt && (
              <p className="text-[11px] text-muted-foreground font-mono">
                Horodatage d&apos;arrêt : {new Date(permit.suspendedAt).toLocaleString("fr-FR")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* RAISON DU REFUS SI REFUSÉ */}
      {permit.status === "refuse" && permit.rejectionReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3 text-destructive">
          <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-sm">Permis de travail refusé par le Responsable QHSE</h2>
            <p className="text-xs mt-1 leading-relaxed">{permit.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* DÉTAILS PERMIS */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" />
                Informations sur l&apos;intervention
              </CardTitle>
              {/* BOUTON DIRECT CRÉATION D'ACTION CAPA */}
              <ActionForm workPermitId={permit.id} assignableUsers={assignableUsers} />
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Catégorie de risque</span>
                <span className="font-medium">{PERMIT_TYPE_LABELS[permit.permitType]}</span>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block">Lieu & Emplacement</span>
                <div className="flex items-center gap-1.5 font-medium mt-0.5">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {permit.location || "Non renseigné"}
                </div>
              </div>

              {permit.contractorCompany && (
                <div>
                  <span className="text-xs text-muted-foreground block">Entreprise Intervenante / Sous-traitante</span>
                  <span className="font-medium block mt-0.5">🏢 {permit.contractorCompany}</span>
                </div>
              )}

              {permit.equipmentName && (
                <div>
                  <span className="text-xs text-muted-foreground block">Équipement / Machine Rattaché</span>
                  <Link
                    href={`/equipements/${permit.equipmentId}`}
                    className="font-medium text-primary hover:underline block mt-0.5"
                  >
                    ⚙️ {permit.equipmentName}
                  </Link>
                </div>
              )}

              {permit.description && (
                <div>
                  <span className="text-xs text-muted-foreground block">Description des travaux</span>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground bg-muted/30 p-3 rounded-md">
                    {permit.description}
                  </p>
                </div>
              )}

              <div className="border-t border-border pt-4 space-y-4">
                <h2 className="font-semibold text-xs text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Mesures de Prévention & Consignes de Sécurité Validées
                </h2>

                {/* CHECKLISTS PAR PHASES : AVANT / PENDANT / APRÈS */}
                {((permit.beforeMeasures?.length ?? 0) > 0 || (permit.duringMeasures?.length ?? 0) > 0 || (permit.afterMeasures?.length ?? 0) > 0) ? (
                  <div className="space-y-4">
                    {(permit.beforeMeasures?.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                          ⚡ MESURES AVANT INTERVENTION ({permit.beforeMeasures?.filter(m => m.checked).length}/{permit.beforeMeasures?.length})
                        </span>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {permit.beforeMeasures?.map((m) => (
                            <div key={m.id} className="flex items-center gap-2 text-xs rounded-md bg-muted/20 p-2 border border-border">
                              {m.checked ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              )}
                              <span className={m.checked ? "font-medium" : "text-muted-foreground line-through"}>{m.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(permit.duringMeasures?.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                          ⚙️ MESURES PENDANT INTERVENTION ({permit.duringMeasures?.filter(m => m.checked).length}/{permit.duringMeasures?.length})
                        </span>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {permit.duringMeasures?.map((m) => (
                            <div key={m.id} className="flex items-center gap-2 text-xs rounded-md bg-muted/20 p-2 border border-border">
                              {m.checked ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              )}
                              <span className={m.checked ? "font-medium" : "text-muted-foreground line-through"}>{m.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(permit.afterMeasures?.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                          ✅ MESURES APRÈS INTERVENTION / CLÔTURE ({permit.afterMeasures?.filter(m => m.checked).length}/{permit.afterMeasures?.length})
                        </span>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {permit.afterMeasures?.map((m) => (
                            <div key={m.id} className="flex items-center gap-2 text-xs rounded-md bg-muted/20 p-2 border border-border">
                              {m.checked ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              )}
                              <span className={m.checked ? "font-medium" : "text-muted-foreground line-through"}>{m.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {permit.safetyMeasures.map((measure) => (
                      <div
                        key={measure.id}
                        className="flex items-center gap-2 text-xs rounded-md bg-muted/20 p-2 border border-border"
                      >
                        {measure.checked ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <span className={measure.checked ? "font-medium" : "text-muted-foreground"}>
                          {measure.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ÉQUIPEMENTS DE PROTECTION INDIVIDUELLE (EPI) */}
              {permit.epiRequirements && (
                <div className="border-t border-border pt-4 space-y-3">
                  <h2 className="font-semibold text-xs text-foreground flex items-center gap-2">
                    🛡️ Équipements de Protection Individuelle (EPI) Exigés
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(permit.epiRequirements)
                      ? permit.epiRequirements.map((epiKey) => (
                          <span
                            key={epiKey}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                          >
                            ✓ {epiKey}
                          </span>
                        ))
                      : Object.entries(permit.epiRequirements)
                          .filter(([, req]) => req)
                          .map(([epiKey]) => (
                            <span
                              key={epiKey}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                            >
                              ✓ {epiKey}
                            </span>
                          ))}
                  </div>
                </div>
              )}

              {/* QUESTIONNAIRE SPÉCIFIQUE AU TYPE DE TRAVAIL */}
              {permit.questionnaireAnswers && Object.keys(permit.questionnaireAnswers).length > 0 && (
                <div className="border-t border-border pt-4 space-y-3">
                  <h2 className="font-semibold text-xs text-foreground flex items-center gap-2">
                    📋 Evaluation Spécifique du Risque ({PERMIT_TYPE_LABELS[permit.permitType]})
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(permit.questionnaireAnswers).map(([qKey, val]) => (
                      <div key={qKey} className="p-2.5 rounded-md bg-muted/30 border border-border text-xs space-y-1">
                        <span className="text-[11px] text-muted-foreground font-mono uppercase block">{qKey}</span>
                        <div className="font-medium flex items-center justify-between">
                          <span>Valeur :</span>
                          <span className={
                            val === "non" || val === "non_conforme"
                              ? "px-2 py-0.5 rounded bg-destructive/10 text-destructive font-bold"
                              : val === "oui" || val === "conforme"
                              ? "px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold"
                              : "px-2 py-0.5 rounded bg-muted text-foreground font-semibold"
                          }>
                            {String(val).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CONSIGNES ET PLAN DE SECOURS */}
              {permit.emergencyPlan?.text && (
                <div className="border-t border-border pt-4 space-y-2">
                  <h2 className="font-semibold text-xs text-destructive flex items-center gap-2">
                    🚨 Plan de Secours & Procédure d&apos;Urgence
                  </h2>
                  <p className="text-xs bg-destructive/5 border border-destructive/20 text-destructive p-3 rounded-md leading-relaxed whitespace-pre-wrap font-medium">
                    {permit.emergencyPlan.text}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CARTE ÉQUIPE D'INTERVENANTS */}
          <PermitWorkersCard permitId={permit.id} workers={workers} canManage={canManage} />

          {/* GALERIE PREUVES TERRAIN (AVANT / PENDANT / APRÈS) */}
          <ProofGallery workPermitId={permit.id} />

          {/* TIMELINE D'HISTORIQUE & TRAÇABILITÉ */}
          <PermitHistoryTimeline historyEvents={historyEvents} />
        </div>

        {/* SIDEBAR METADATA */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Planification Temporelle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Début d&apos;autorisation
                </span>
                <span className="font-mono font-medium block mt-0.5">
                  {new Date(permit.startTime).toLocaleString("fr-FR")}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Échéance de fin
                </span>
                <span className="font-mono font-medium block mt-0.5">
                  {new Date(permit.endTime).toLocaleString("fr-FR")}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Signatures & Validations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Demandé par
                </span>
                <span className="font-medium block mt-0.5">{permit.applicantName}</span>
              </div>

              <div>
                <span className="text-muted-foreground block flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Approuvé par
                </span>
                <span className="font-medium block mt-0.5">
                  {permit.approverName || "En attente d'approbation"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* FICHE QR CODE DE CONTRÔLE TERRAIN */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <QrIcon className="h-4 w-4 text-primary" />
                QR Code Contrôle Terrain
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-center">
              <QrCode value={`/scan/permis/${permit.id}`} size={160} />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Scannable par smartphone ou tablette pour vérification instantanée sur le chantier.
              </p>
              <Link href={`/scan/permis/${permit.id}`} target="_blank">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  Tester la vue scan mobile →
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
