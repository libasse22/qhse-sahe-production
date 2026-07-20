import { notFound } from "next/navigation";
import Link from "next/link";
import { getEquipmentById } from "@/lib/services/equipment.service";
import { listIncidentsByEquipment } from "@/lib/services/incidents.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode } from "@/components/equipment/qr-code";
import { EquipmentStatusSelect } from "@/components/equipment/equipment-status-select";
import { SeverityBadge } from "@/components/incidents/severity-badge";
import { IncidentStatusBadge } from "@/components/incidents/status-badge";
import { PrintButton } from "@/components/equipment/print-button";

export default async function EquipementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const equipment = await getEquipmentById(id);
  if (!equipment) notFound();

  const [incidents, permissions] = await Promise.all([listIncidentsByEquipment(id), getCurrentPermissions()]);
  const canManage = permissions.has("equipment.manage");

  // Résolu côté serveur : l'URL publique doit fonctionner une fois imprimée,
  // peu importe où le QR est scanné.
  const scanPath = `/scan/${id}`;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <h1 className="text-2xl font-semibold">{equipment.name}</h1>
          <p className="text-muted-foreground">
            {equipment.category || "Catégorie non précisée"} · {equipment.siteName || "Aucun site"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Numéro de série : </span>
              {equipment.serialNumber || "—"}
            </p>
            {canManage && (
              <div>
                <p className="mb-1 text-muted-foreground">Statut :</p>
                <EquipmentStatusSelect equipmentId={id} status={equipment.status} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidents liés ({incidents.length})</CardTitle>
            <CardDescription>Signalements déclarés en scannant le QR de cet équipement.</CardDescription>
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun incident signalé sur cet équipement.</p>
            ) : (
              <ul className="space-y-2">
                {incidents.map((incident) => (
                  <li key={incident.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0">
                    <Link href={`/incidents/${incident.id}`} className="text-sm font-medium hover:underline">
                      {incident.title}
                    </Link>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={incident.severity} />
                      <IncidentStatusBadge status={incident.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>QR code</CardTitle>
          <CardDescription>À imprimer et coller sur l&apos;équipement.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <QrCode value={scanPath} />
          <p className="text-center text-xs text-muted-foreground">
            Scanner ce QR avec l&apos;appareil photo du téléphone ouvre directement la fiche de l&apos;équipement.
          </p>
          <PrintButton />
        </CardContent>
      </Card>
    </div>
  );
}
