import { notFound } from "next/navigation";
import { Calendar, User, ShieldCheck, MapPin } from "lucide-react";
import {
  getAuditById,
  getAuditItems,
  getAuditProofLinks,
  listAuditHistory,
  getAuditSummaryMetrics,
} from "@/lib/services/audits.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { listActiveUsers } from "@/lib/services/users.service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuditStatusSelect } from "@/components/audits/status-select";
import { AuditDetailClient } from "@/components/audits/audit-detail-client";
import { AUDIT_STATUS_BADGE, AUDIT_STATUS_LABELS } from "@/lib/types/audit";

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const audit = await getAuditById(id);
  if (!audit) notFound();

  const [items, proofLinks, history, summaryMetrics, permissions, users] = await Promise.all([
    getAuditItems(id),
    getAuditProofLinks(id),
    listAuditHistory(id),
    getAuditSummaryMetrics(id),
    getCurrentPermissions(),
    listActiveUsers(),
  ]);

  const canManage = permissions.has("audits.manage");

  return (
    <div className="space-y-6">
      {/* En-tête enrichi d'audit */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={AUDIT_STATUS_BADGE[audit.status]}>
              {AUDIT_STATUS_LABELS[audit.status]}
            </Badge>
            <h1 className="text-2xl font-bold">{audit.title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <User className="h-3.5 w-3.5 text-primary" /> Auditeur : {audit.auditorName}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Date planifiée : {new Date(audit.plannedDate).toLocaleDateString("fr-FR")}
            </span>
            {audit.siteName && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-amber-500" /> Site : {audit.siteName}
              </span>
            )}
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-500" /> Référentiel : {audit.referenceFramework}
            </span>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <AuditStatusSelect auditId={id} status={audit.status} />
          </div>
        )}
      </div>

      {/* Détails du périmètre & critères */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 grid gap-4 sm:grid-cols-2 text-xs">
          <div>
            <span className="font-semibold text-muted-foreground uppercase text-[10px]">Périmètre d'audit</span>
            <p className="mt-0.5 text-sm">{audit.scope}</p>
          </div>
          <div>
            <span className="font-semibold text-muted-foreground uppercase text-[10px]">Critères & Exigences</span>
            <p className="mt-0.5 text-sm">{audit.criteria}</p>
          </div>
        </CardContent>
      </Card>

      {/* Module principal interactif Client */}
      <AuditDetailClient
        audit={audit}
        items={items}
        proofLinks={proofLinks}
        history={history}
        summaryMetrics={summaryMetrics}
        canManage={canManage}
        users={users}
      />
    </div>
  );
}
