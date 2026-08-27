import { redirect } from "next/navigation";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegulationForm } from "@/components/regulation/regulation-form";

export default async function NouveauReglementPage() {
  const permissions = await getCurrentPermissions();
  if (!permissions.has("policy.publish")) redirect("/reglement-interieur");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Publier le reglement interieur</h1>
        <p className="text-muted-foreground">
          Cette version remplace automatiquement la version actuellement diffusee.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouvelle version</CardTitle>
          <CardDescription>Ajoute un texte, un PDF, ou les deux.</CardDescription>
        </CardHeader>
        <CardContent>
          <RegulationForm />
        </CardContent>
      </Card>
    </div>
  );
}
