import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IncidentForm } from "@/components/incidents/incident-form";
import { createIncident } from "@/lib/services/incidents.service";
import type { ActionResult } from "@/lib/services/auth.service";

export default function NouvelIncidentPage() {
  async function action(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
    "use server";
    return createIncident(formData);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Déclarer un incident</h1>
        <p className="text-muted-foreground">
          Toute déclaration est immédiatement visible par les managers QHSE.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détails de l&apos;incident</CardTitle>
          <CardDescription>Sois aussi précis que possible : lieu, circonstances, personnes impliquées.</CardDescription>
        </CardHeader>
        <CardContent>
          <IncidentForm action={action} submitLabel="Déclarer l'incident" />
        </CardContent>
      </Card>
    </div>
  );
}
