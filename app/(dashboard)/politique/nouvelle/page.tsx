import { redirect } from "next/navigation";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PolicyForm } from "@/components/policy/policy-form";

export default async function NouvellePolitiquePage() {
  const permissions = await getCurrentPermissions();
  if (!permissions.has("policy.publish")) redirect("/politique");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Publier la politique QHSE</h1>
        <p className="text-muted-foreground">
          Exigence ISO 9001 / 14001 / 45001 §5.2 : la politique doit être documentée et communiquée.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouvelle version</CardTitle>
          <CardDescription>Remplace automatiquement la version actuellement diffusée.</CardDescription>
        </CardHeader>
        <CardContent>
          <PolicyForm />
        </CardContent>
      </Card>
    </div>
  );
}
