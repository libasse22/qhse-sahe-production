import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, MapPin, Wrench } from "lucide-react";
import { getEquipmentById } from "@/lib/services/equipment.service";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EQUIPMENT_STATUS_BADGE, EQUIPMENT_STATUS_LABELS } from "@/lib/types/equipment";

export default async function ScanEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [equipment, profile] = await Promise.all([getEquipmentById(id), getCurrentProfile()]);

  if (!equipment) notFound();

  const isWorker = profile?.role === "employe";
  const reportHref = isWorker ? `/ouvrier/declarer?equipmentId=${id}` : `/equipements/${id}`;

  return (
    <main className="register-grid flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Wrench className="h-8 w-8" />
        </div>

        <div>
          <h1 className="text-xl font-bold">{equipment.name}</h1>
          <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {equipment.siteName || "Aucun site"}
          </p>
        </div>

        <Badge variant={EQUIPMENT_STATUS_BADGE[equipment.status]}>{EQUIPMENT_STATUS_LABELS[equipment.status]}</Badge>

        <Button asChild size="lg" className="h-16 w-full text-lg font-bold">
          <Link href={reportHref}>
            <AlertTriangle className="h-6 w-6" />
            {isWorker ? "Signaler un problème" : "Voir la fiche équipement"}
          </Link>
        </Button>
      </div>
    </main>
  );
}
