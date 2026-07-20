import { notFound } from "next/navigation";
import { Calendar, User } from "lucide-react";
import { getAuditById, listFindings } from "@/lib/services/audits.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuditStatusSelect } from "@/components/audits/status-select";
import { FindingForm } from "@/components/audits/finding-form";
import { FINDING_TYPE_BADGE, FINDING_TYPE_LABELS } from "@/lib/types/audit";

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const audit = await getAuditById(id);
  if (!audit) notFound();

  const [findings, permissions] = await Promise.all([listFindings(id), getCurrentPermissions()]);
  const canManage = permissions.has("audits.manage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{audit.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" /> {audit.auditorName}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> {new Date(audit.plannedDate).toLocaleDateString("fr-FR")}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Périmètre et critères</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="font-medium">Périmètre : </span>{audit.scope}</p>
              <p><span className="font-medium">Critères : </span>{audit.criteria}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Constats ({findings.length})</CardTitle>
              <CardDescription>Conformités, non-conformités et points sensibles relevés.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {findings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun constat enregistré.</p>
              ) : (
                <ul className="space-y-3">
                  {findings.map((f) => (
                    <li key={f.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant={FINDING_TYPE_BADGE[f.type]}>{FINDING_TYPE_LABELS[f.type]}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm">{f.description}</p>
                    </li>
                  ))}
                </ul>
              )}
              {canManage && <FindingForm auditId={id} />}
            </CardContent>
          </Card>
        </div>

        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>Statut de l&apos;audit</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditStatusSelect auditId={id} status={audit.status} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
