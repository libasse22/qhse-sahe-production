import Link from "next/link";
import { listEquipment } from "@/lib/services/equipment.service";
import { listSites } from "@/lib/services/sites.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EquipmentForm } from "@/components/equipment/equipment-form";
import { EQUIPMENT_STATUS_BADGE, EQUIPMENT_STATUS_LABELS } from "@/lib/types/equipment";

export default async function EquipementsPage() {
  const [equipment, sites, permissions] = await Promise.all([listEquipment(), listSites(), getCurrentPermissions()]);
  const canManage = permissions.has("equipment.manage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Équipements</h1>
        <p className="text-muted-foreground">
          Chaque équipement a un QR code imprimable : le scanner ouvre sa fiche et permet de signaler un problème en un geste.
        </p>
      </div>

      {canManage && <EquipmentForm sites={sites} />}

      {equipment.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Aucun équipement enregistré.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {equipment.map((eq) => (
            <Link key={eq.id} href={`/equipements/${eq.id}`}>
              <Card className="h-full transition-colors hover:bg-accent/40">
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{eq.name}</p>
                    <Badge variant={EQUIPMENT_STATUS_BADGE[eq.status]}>{EQUIPMENT_STATUS_LABELS[eq.status]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{eq.category || "Catégorie non précisée"}</p>
                  <p className="text-xs text-muted-foreground">{eq.siteName || "Aucun site"}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
