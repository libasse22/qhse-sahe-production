import Link from "next/link";
import { Plus } from "lucide-react";
import { listAudits } from "@/lib/services/audits.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AUDIT_STATUS_BADGE, AUDIT_STATUS_LABELS } from "@/lib/types/audit";

export default async function AuditsPage() {
  const [audits, permissions] = await Promise.all([listAudits(), getCurrentPermissions()]);
  const canManage = permissions.has("audits.manage");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audits internes</h1>
          <p className="text-muted-foreground">Programme et suivi des audits QHSE (ISO 9001 §9.2).</p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/audits/nouveau">
              <Plus className="h-4 w-4" />
              Planifier un audit
            </Link>
          </Button>
        )}
      </div>

      {audits.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Aucun audit planifié.</CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="px-6 py-3 font-medium">Audit</th>
                <th className="px-6 py-3 font-medium">Auditeur</th>
                <th className="px-6 py-3 font-medium">Date planifiée</th>
                <th className="px-6 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="px-6 py-3">
                    <Link href={`/audits/${audit.id}`} className="font-medium hover:underline">
                      {audit.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{audit.scope}</p>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{audit.auditorName}</td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {new Date(audit.plannedDate).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={AUDIT_STATUS_BADGE[audit.status]}>{AUDIT_STATUS_LABELS[audit.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
