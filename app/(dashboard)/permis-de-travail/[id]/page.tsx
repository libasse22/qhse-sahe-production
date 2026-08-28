import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkPermitById } from "@/lib/services/permits.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermitStatusBadge } from "@/components/permits/permit-status-badge";
import { PermitActionButtons } from "@/components/permits/permit-action-buttons";
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
  const canManage = permissions.has("actions.manage");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4">
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

        {/* WORKFLOW ACTIONS */}
        <PermitActionButtons
          permitId={permit.id}
          currentStatus={permit.status}
          canManage={canManage}
        />
      </div>

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
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" />
              Informations sur l&apos;intervention
            </CardTitle>
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

            <div className="border-t border-border pt-3 space-y-3">
              <h2 className="font-semibold text-xs text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Mesures de Prévention & Consignes de Sécurité Validées
              </h2>

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
            </div>
          </CardContent>
        </Card>

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
        </div>
      </div>
    </div>
  );
}
