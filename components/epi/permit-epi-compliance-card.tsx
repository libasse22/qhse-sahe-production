"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, HardHat, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { EpiPermitComplianceResult } from "@/lib/types/epi";

interface PermitEpiComplianceCardProps {
  compliance: EpiPermitComplianceResult;
}

export function PermitEpiComplianceCard({ compliance }: PermitEpiComplianceCardProps) {
  if (!compliance.hasEpiRequirements) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardHat className="h-4 w-4 text-primary" />
              <span>Conformité EPI Intervenants</span>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              N/A — Aucune exigence
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground italic">
            Aucun EPI spécifique n&apos;est exigé par le référentiel de ce permis de travail (EPI de chantier standards habituels requis).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border shadow-sm transition-all ${
      compliance.isCompliant ? "border-emerald-500/30" : "border-destructive/40"
    }`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`h-4 w-4 ${compliance.isCompliant ? "text-emerald-600" : "text-destructive"}`} />
            <span>Conformité EPI Intervenants ({compliance.totalCompliant} / {compliance.totalRequired})</span>
          </div>
          <Badge
            variant={compliance.isCompliant ? "success" : "destructive"}
            className="text-[10px] uppercase font-bold"
          >
            {compliance.isCompliant ? "🟢 CONFORME" : "🔴 NON CONFORME"}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* BANNIÈRE D'ALERTE EN CAS DE NON CONFORMITÉ */}
        {!compliance.isCompliant && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 flex items-start gap-2.5 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block uppercase text-[11px]">
                ⚠️ DÉMARRAGE DU PERMIS BLOQUÉ
              </span>
              <p className="leading-relaxed">
                {compliance.summary}
              </p>
            </div>
          </div>
        )}

        {/* TABLEAU MATRICIEL INTERVENANT X EPI */}
        {compliance.items.length > 0 ? (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground font-semibold uppercase text-[10px] border-b border-border">
                  <th className="p-2.5">Intervenant</th>
                  <th className="p-2.5">EPI Requis</th>
                  <th className="p-2.5 text-center">Statut Contrôle</th>
                  <th className="p-2.5">Détail / Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {compliance.items.map((item, idx) => {
                  const isOk = item.status === "conforme";
                  const isMissing = item.status === "manquant";
                  const isExpired = item.status === "expire";

                  return (
                    <tr key={idx} className={`transition-colors ${
                      isOk ? "bg-card" : isMissing ? "bg-amber-500/5" : "bg-destructive/5"
                    }`}>
                      <td className="p-2.5 font-bold text-foreground">{item.workerName}</td>
                      <td className="p-2.5 font-medium">{item.requiredEpiLabel}</td>
                      <td className="p-2.5 text-center">
                        {isOk ? (
                          <Badge variant="success" className="text-[10px] gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Conforme
                          </Badge>
                        ) : isExpired ? (
                          <Badge variant="warning" className="text-[10px] gap-1">
                            <Clock className="h-3 w-3" /> Expiré
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] gap-1">
                            <XCircle className="h-3 w-3" /> {isMissing ? "Manquant" : "Défectueux"}
                          </Badge>
                        )}
                      </td>
                      <td className="p-2.5 text-muted-foreground text-[11px]">
                        {item.message || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Aucun intervenant n&apos;est actuellement assigné à ce permis pour effectuer le rapprochement EPI.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
