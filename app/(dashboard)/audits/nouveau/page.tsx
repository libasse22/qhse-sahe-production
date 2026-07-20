import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditForm } from "@/components/audits/audit-form";
import { listActiveUsers } from "@/lib/services/users.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";

export default async function NouvelAuditPage() {
  const permissions = await getCurrentPermissions();
  if (!permissions.has("audits.manage")) redirect("/audits");

  const users = await listActiveUsers();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Planifier un audit interne</h1>
        <p className="text-muted-foreground">ISO 9001 §9.2 — programme d&apos;audit basé sur l&apos;importance des processus.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détails de l&apos;audit</CardTitle>
          <CardDescription>Le périmètre et les critères définissent le cadre de l&apos;audit.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuditForm assignableUsers={users} />
        </CardContent>
      </Card>
    </div>
  );
}
