import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { getIncidentById, updateIncident } from "@/lib/services/incidents.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IncidentForm } from "@/components/incidents/incident-form";
import type { ActionResult } from "@/lib/services/auth.service";

export default async function ModifierIncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const permissions = await getCurrentPermissions();
  const incident = await getIncidentById(id);

  if (!incident) notFound();

  const isQhseOrAdmin = permissions.has("incidents.manage_all");
  const canEdit = isQhseOrAdmin || (incident.reportedBy === profile?.id && incident.status === "declare");
  if (!canEdit) redirect(`/incidents/${id}`);

  async function action(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
    "use server";
    return updateIncident(id, formData);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Modifier l&apos;incident</h1>
        <p className="text-muted-foreground">Corrige les informations de la déclaration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détails de l&apos;incident</CardTitle>
          <CardDescription>Les champs marqués sont requis.</CardDescription>
        </CardHeader>
        <CardContent>
          <IncidentForm action={action} initialData={incident} submitLabel="Enregistrer les modifications" />
        </CardContent>
      </Card>
    </div>
  );
}
