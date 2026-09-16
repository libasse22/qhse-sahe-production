import Link from "next/link";
import { Plus, ShieldCheck, MapPin, Calendar, User } from "lucide-react";
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
          <h1 className="text-2xl font-bold">Registre des Audits QHSE</h1>
          <p className="text-muted-foreground text-sm">
            Module d&apos;audit transversal et traçabilité 360° des preuves (ISO 9001 §9.2 / ISO 45001 §9.2).
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/audits/nouveau">
              <Plus className="h-4 w-4 mr-1.5" />
              Initialiser un audit
            </Link>
          </Button>
        )}
      </div>

      {audits.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Aucun audit QHSE enregistré dans le registre. Cliquez sur &quot;Initialiser un audit&quot; pour commencer.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/30 text-xs uppercase text-muted-foreground">
                <th className="px-6 py-3 font-medium">Audit & Référentiel</th>
                <th className="px-6 py-3 font-medium">Site</th>
                <th className="px-6 py-3 font-medium">Auditeur</th>
                <th className="px-6 py-3 font-medium">Date planifiée</th>
                <th className="px-6 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {audits.map((audit) => (
                <tr key={audit.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/audits/${audit.id}`} className="font-semibold text-foreground hover:text-primary hover:underline">
                      {audit.title}
                    </Link>
                    <p className="text-xs text-muted-foreground line-clamp-1">{audit.scope}</p>
                    {audit.referenceFramework && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 mt-0.5">
                        <ShieldCheck className="h-3 w-3" /> {audit.referenceFramework}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {audit.siteName ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-amber-500" /> {audit.siteName}
                      </span>
                    ) : (
                      "Tous / Transversal"
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" /> {audit.auditorName}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {new Date(audit.plannedDate).toLocaleDateString("fr-FR")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={AUDIT_STATUS_BADGE[audit.status]}>
                      {AUDIT_STATUS_LABELS[audit.status]}
                    </Badge>
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
