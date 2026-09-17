"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, AlertOctagon, FileCheck2, HardHat, Wrench, Siren } from "lucide-react";
import type { CockpitData } from "@/lib/services/cockpit.service";

interface ExecutiveSummaryCardProps {
  data: CockpitData;
  companyName?: string;
}

export function ExecutiveSummaryCard({ data, companyName = "QHSE Duo Sénégal" }: ExecutiveSummaryCardProps) {
  const { permitsKpi, epiKpi, capaKpi, auditsKpi, inspectionsKpi, gedKpi, stats } = data;

  const totalUrgent =
    capaKpi.enRetard +
    capaKpi.bloquees +
    permitsKpi.suspendus +
    permitsKpi.expirantMoins2h +
    epiKpi.expires +
    epiKpi.defectueux +
    stats.incidentsBySeverity.critique;

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-bold">Synthèse Direction Factuelle</CardTitle>
          </div>
          <Badge variant={totalUrgent > 0 ? "warning" : "success"}>
            {totalUrgent > 0 ? `${totalUrgent} point(s) d'attention prioritaire` : "Situation maîtrisée"}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Vue macroscopique et récapitulatif factuel sans score arbitraire ni prédiction inventée ({companyName}).
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 text-xs">
          {/* Incidents */}
          <div className="rounded-lg border border-border bg-accent/30 p-3 text-center">
            <div className="flex justify-center text-rose-500 mb-1">
              <Siren className="h-4 w-4" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Incidents en cours</p>
            <p className="text-lg font-bold text-foreground">{stats.incidentsEnCours}</p>
            <p className="text-[10px] text-rose-600">{stats.incidentsBySeverity.critique} critique(s)</p>
          </div>

          {/* CAPA Retard & Bloquées */}
          <div className="rounded-lg border border-border bg-accent/30 p-3 text-center">
            <div className="flex justify-center text-rose-500 mb-1">
              <Wrench className="h-4 w-4" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">CAPA Réclamant Action</p>
            <p className="text-lg font-bold text-rose-600">{capaKpi.enRetard + capaKpi.bloquees}</p>
            <p className="text-[10px] text-muted-foreground">{capaKpi.enRetard} retard | {capaKpi.bloquees} bloquée</p>
          </div>

          {/* Permis Actifs & Suspendus */}
          <div className="rounded-lg border border-border bg-accent/30 p-3 text-center">
            <div className="flex justify-center text-blue-500 mb-1">
              <FileCheck2 className="h-4 w-4" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Permis Actifs</p>
            <p className="text-lg font-bold text-emerald-600">{permitsKpi.actifs}</p>
            <p className="text-[10px] text-rose-600 font-semibold">{permitsKpi.suspendus} suspendu(s)</p>
          </div>

          {/* EPI Critiques */}
          <div className="rounded-lg border border-border bg-accent/30 p-3 text-center">
            <div className="flex justify-center text-emerald-500 mb-1">
              <HardHat className="h-4 w-4" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">EPI Critiques</p>
            <p className={`text-lg font-bold ${epiKpi.expires + epiKpi.defectueux > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {epiKpi.expires + epiKpi.defectueux}
            </p>
            <p className="text-[10px] text-muted-foreground">{epiKpi.expires} expiré | {epiKpi.defectueux} HS</p>
          </div>

          {/* NC Audits & Inspections */}
          <div className="rounded-lg border border-border bg-accent/30 p-3 text-center">
            <div className="flex justify-center text-purple-500 mb-1">
              <AlertOctagon className="h-4 w-4" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Points NC Relevés</p>
            <p className="text-lg font-bold text-amber-600">{auditsKpi.pointsNc + inspectionsKpi.nonConformes}</p>
            <p className="text-[10px] text-muted-foreground">Audits & Inspections</p>
          </div>

          {/* GED Action */}
          <div className="rounded-lg border border-border bg-accent/30 p-3 text-center">
            <div className="flex justify-center text-indigo-500 mb-1">
              <Building2 className="h-4 w-4" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">GED À Traiter</p>
            <p className="text-lg font-bold text-foreground">{gedKpi.enRevision + gedKpi.signaturesEnAttente}</p>
            <p className="text-[10px] text-muted-foreground">{gedKpi.signaturesEnAttente} signature(s)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
