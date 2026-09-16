"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle, FileText, Wrench } from "lucide-react";

interface AuditorSummaryCardProps {
  metrics: {
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
}

export function AuditorSummaryCard({ metrics }: AuditorSummaryCardProps) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Synthèse Auditeur & Métriques Déterministes</CardTitle>
          <Badge
            variant={metrics.evaluatedCount === 0 ? "outline" : metrics.compliancePercentage >= 80 ? "success" : "destructive"}
          >
            {metrics.complianceRateLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-border bg-accent/30 p-3 text-center">
            <div className="flex justify-center text-emerald-500 mb-1">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground">Conformes</p>
            <p className="text-lg font-bold text-emerald-600">{metrics.me}</p>
          </div>

          <div className="rounded-lg border border-border bg-accent/30 p-3 text-center">
            <div className="flex justify-center text-rose-500 mb-1">
              <AlertOctagon className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground">Non conformes</p>
            <p className="text-lg font-bold text-rose-600">{metrics.nc}</p>
          </div>

          <div className="rounded-lg border border-border bg-accent/30 p-3 text-center">
            <div className="flex justify-center text-amber-500 mb-1">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground">Observations</p>
            <p className="text-lg font-bold text-amber-600">{metrics.obs}</p>
          </div>

          <div className="rounded-lg border border-border bg-accent/30 p-3 text-center">
            <div className="flex justify-center text-muted-foreground mb-1">
              <HelpCircle className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground">N/A</p>
            <p className="text-lg font-bold">{metrics.na}</p>
          </div>

          <div className="rounded-lg border border-border bg-accent/30 p-3 text-center">
            <div className="flex justify-center text-muted-foreground mb-1">
              <HelpCircle className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground">Non évalués</p>
            <p className="text-lg font-bold text-muted-foreground">{metrics.ne}</p>
          </div>

          <div className="rounded-lg border border-border bg-accent/30 p-3 text-center">
            <div className="flex justify-center text-blue-500 mb-1">
              <FileText className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground">Preuves liées</p>
            <p className="text-lg font-bold text-blue-600">{metrics.totalProofsLinked}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Points sans preuve : <strong className={metrics.itemsWithoutProofs > 0 ? "text-amber-600" : ""}>{metrics.itemsWithoutProofs}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Wrench className="h-3 w-3 text-primary" /> CAPA générées : <strong>{metrics.capasGenerated}</strong>
            </span>
          </div>
          <span>Total points d'audit : {metrics.totalItems}</span>
        </div>
      </CardContent>
    </Card>
  );
}
