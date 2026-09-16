import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditForm } from "@/components/audits/audit-form";
import { listActiveUsers } from "@/lib/services/users.service";
import { listSites } from "@/lib/services/sites.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";

export default async function NouvelAuditPage() {
  const permissions = await getCurrentPermissions();
  if (!permissions.has("audits.manage")) redirect("/audits");

  const [users, sites] = await Promise.all([listActiveUsers(), listSites()]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Initialiser un audit QHSE</h1>
        <p className="text-muted-foreground">
          Programme d&apos;audit transversal et préparation du registre (ISO 9001 §9.2 / ISO 45001 §9.2).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détails & Cadre de l&apos;audit</CardTitle>
          <CardDescription>
            Définissez le périmètre, le référentiel d&apos;évaluation, le site et l&apos;auditeur désigné.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditForm assignableUsers={users} sites={sites} />
        </CardContent>
      </Card>
    </div>
  );
}
