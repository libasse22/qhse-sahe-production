import Link from "next/link";
import { notFound } from "next/navigation";
import { HardHat, UserCheck, ShieldCheck, Calendar, CheckCircle2 } from "lucide-react";
import { getPublicEpiAssignment } from "@/lib/services/epi.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EPI_CATEGORY_LABELS, EPI_CONDITION_BADGE, EPI_CONDITION_LABELS, type EpiConditionState, type EpiCategory } from "@/lib/types/epi";

export default async function ScanEpiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const epi = await getPublicEpiAssignment(id);

  if (!epi) notFound();

  const condState = (epi.conditionState as EpiConditionState) || "bon";
  const cat = (epi.category as EpiCategory) || "autre";

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900/90 p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <HardHat className="h-6 w-6" />
            </div>
            <div>
              <span className="font-mono text-xs font-semibold text-amber-500">
                {epi.serialNumber || "EPI INDIVIDUEL"}
              </span>
              <h1 className="text-lg font-bold leading-tight">{epi.catalogName}</h1>
            </div>
          </div>
          <Badge variant={EPI_CONDITION_BADGE[condState] || "outline"}>
            {EPI_CONDITION_LABELS[condState] || condState}
          </Badge>
        </div>

        <div className="space-y-3 rounded-lg bg-muted/40 p-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5" /> Employé Bénéficiaire :
            </span>
            <span className="font-bold text-sm text-foreground">{epi.recipientName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Norme & Catégorie :
            </span>
            <span className="font-medium">
              {EPI_CATEGORY_LABELS[cat] || cat} {epi.isoNorm ? `(${epi.isoNorm})` : ""}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Remis le :
            </span>
            <span className="font-medium">
              {epi.assignedAt ? new Date(epi.assignedAt).toLocaleDateString("fr-FR") : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between border-t pt-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirmation d'émargement :
            </span>
            {epi.confirmedAt ? (
              <Badge variant="success" className="text-[10px]">
                ✓ Reçu le {new Date(epi.confirmedAt).toLocaleDateString("fr-FR")}
              </Badge>
            ) : (
              <Badge variant="warning" className="text-[10px]">
                ⏳ En attente de confirmation
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">
              Se connecter à la plateforme QHSE →
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
