"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Printer, CheckSquare, Grid, History } from "lucide-react";
import Link from "next/link";
import { AuditorSummaryCard } from "@/components/audits/auditor-summary-card";
import { AuditItemsManager } from "@/components/audits/audit-items-manager";
import { ProofMatrixView } from "@/components/audits/proof-matrix-view";
import { AuditHistoryView } from "@/components/audits/audit-history-view";
import { Proof360Modal } from "@/components/audits/proof-360-modal";
import type { Audit, AuditItem, AuditProofLink, AuditHistoryEvent } from "@/lib/types/audit";
import type { Profile } from "@/lib/types/auth";

interface AuditDetailClientProps {
  audit: Audit;
  items: AuditItem[];
  proofLinks: AuditProofLink[];
  history: AuditHistoryEvent[];
  summaryMetrics: {
    totalItems: number;
    me: number;
    nc: number;
    obs: number;
    na: number;
    ne: number;
    evaluatedCount: number;
    compliancePercentage: number;
    complianceRateLabel: string;
    totalProofsLinked: number;
    itemsWithoutProofs: number;
    capasGenerated: number;
  };
  canManage: boolean;
  users: Profile[];
}

export function AuditDetailClient({
  audit,
  items,
  proofLinks,
  history,
  summaryMetrics,
  canManage,
  users,
}: AuditDetailClientProps) {
  const [activeTab, setActiveTab] = useState("checklist");
  const [selectedProof, setSelectedProof] = useState<AuditProofLink | null>(null);

  return (
    <div className="space-y-6">
      {/* Synthèse Auditeur Top Card */}
      <AuditorSummaryCard metrics={summaryMetrics} />

      {/* Barre d'action supérieure avec bouton Rapport A4 */}
      <div className="space-y-4 border-b border-border pb-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="checklist" className="flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4" /> Points d'audit ({items.length})
              </TabsTrigger>
              <TabsTrigger value="matrix" className="flex items-center gap-1.5">
                <Grid className="h-4 w-4" /> Matrice des Preuves ({proofLinks.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1.5">
                <History className="h-4 w-4" /> Historique Log ({history.length})
              </TabsTrigger>
            </TabsList>

            <Button asChild variant="outline" size="sm">
              <Link href={`/audits/${audit.id}/impression`} target="_blank">
                <Printer className="h-4 w-4 mr-1.5" />
                Rapport A4 Printable
              </Link>
            </Button>
          </div>

          <TabsContent value="checklist" className="pt-4">
            <AuditItemsManager
              auditId={audit.id}
              items={items}
              canManage={canManage}
              users={users}
              onOpenProofModal={(proof) => setSelectedProof(proof)}
            />
          </TabsContent>

          <TabsContent value="matrix" className="pt-4">
            <ProofMatrixView
              items={items}
              proofLinks={proofLinks}
              onOpenProofModal={(proof) => setSelectedProof(proof)}
            />
          </TabsContent>

          <TabsContent value="history" className="pt-4">
            <AuditHistoryView history={history} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal 360° Inspection de preuve */}
      <Proof360Modal proof={selectedProof} onClose={() => setSelectedProof(null)} />
    </div>
  );
}
