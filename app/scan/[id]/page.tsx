import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, MapPin, Wrench, CheckSquare, ShieldCheck } from "lucide-react";
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
  const reportHref = isWorker ? `/ouvrier/declarer?equipmentId=${id}` : `/incidents/nouveau?equipmentId=${id}`;

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900/90 p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <span className="font-mono text-xs font-semibold text-primary">
                {equipment.serialNumber || "ÉQUIPEMENT"}
              </span>
              <h1 className="text-lg font-bold leading-tight">{equipment.name}</h1>
            </div>
          </div>
          <Badge variant={EQUIPMENT_STATUS_BADGE[equipment.status] || "outline"}>
            {EQUIPMENT_STATUS_LABELS[equipment.status] || equipment.status}
          </Badge>
        </div>

        <div className="space-y-3 rounded-lg bg-muted/40 p-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Site / Emplacement :
            </span>
            <span className="font-medium">{equipment.siteName || "Non rattaché"}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Catégorie :
            </span>
            <span className="font-medium">{equipment.category || "Générale"}</span>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Button asChild size="lg" className="w-full h-12 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white">
            <Link href={reportHref}>
              <AlertTriangle className="mr-2 h-5 w-5" />
              Signaler une panne ou une anomalie
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link href={`/inspections/nouvelle?equipmentId=${id}`}>
              <CheckSquare className="mr-2 h-4 w-4 text-primary" />
              Lancer une inspection sur cet équipement
            </Link>
          </Button>

          <Button asChild variant="ghost" className="w-full text-xs text-muted-foreground">
            <Link href={`/equipements/${id}`}>
              Consulter la fiche technique complète →
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
