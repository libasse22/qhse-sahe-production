import Link from "next/link";
import { listEquipment } from "@/lib/services/equipment.service";
import { NewPermitForm } from "@/components/permits/new-permit-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck, ArrowLeft } from "lucide-react";

export default async function NewWorkPermitPage() {
  const equipmentList = await listEquipment();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/permis-de-travail">
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Demande de Permis de Travail (PtW)
          </h1>
          <p className="text-xs text-muted-foreground">
            Formulaire de sécurité préalable aux interventions à risques élevés.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <NewPermitForm equipmentList={equipmentList} />
        </CardContent>
      </Card>
    </div>
  );
}
