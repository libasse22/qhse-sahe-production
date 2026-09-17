"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileCheck2,
  HardHat,
  Wrench,
  Siren,
  ClipboardCheck,
  FileText,
  AlertTriangle,
  Clock,
  ArrowRight,
  Eye,
} from "lucide-react";
import type { CockpitData } from "@/lib/services/cockpit.service";

interface CockpitKpiGridProps {
  data: CockpitData;
}

export function CockpitKpiGrid({ data }: CockpitKpiGridProps) {
  const { permitsKpi, epiKpi, capaKpi, auditsKpi, inspectionsKpi, gedKpi, stats } = data;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-primary" />
        Indicateurs Opérationnels par Domaine Metier
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* ==================================================================
         * 1. PERMIS DE TRAVAIL (PtW)
         * ================================================================== */}
        <Card className="border-border bg-card hover:border-border/80 transition-colors shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-bold">Permis de Travail (PtW)</CardTitle>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
              <Link href="/permis-de-travail">
                Voir <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link href="/permis-de-travail" className="rounded-lg border border-border p-2 bg-accent/20 hover:bg-accent/40 transition-colors">
                <p className="text-muted-foreground text-[10px]">Actifs</p>
                <p className="text-lg font-bold text-emerald-600">{permitsKpi.actifs}</p>
              </Link>

              <Link href="/permis-de-travail" className="rounded-lg border border-border p-2 bg-accent/20 hover:bg-accent/40 transition-colors">
                <p className="text-muted-foreground text-[10px]">En attente</p>
                <p className="text-lg font-bold text-amber-600">{permitsKpi.enAttente}</p>
              </Link>
            </div>

            <div className="flex flex-col gap-1.5 text-xs pt-1 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 text-rose-500" /> Expirant &lt; 2h :
                </span>
                <strong className={permitsKpi.expirantMoins2h > 0 ? "text-rose-600 font-bold" : ""}>
                  {permitsKpi.expirantMoins2h}
                </strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-rose-600" /> Permis suspendus :
                </span>
                {permitsKpi.suspendus > 0 ? (
                  <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
                    {permitsKpi.suspendus} Suspendu{permitsKpi.suspendus > 1 ? "s" : ""}
                  </Badge>
                ) : (
                  <span className="text-emerald-600 font-medium">0</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==================================================================
         * 2. TRAÇABILITÉ EPI
         * ================================================================== */}
        <Card className="border-border bg-card hover:border-border/80 transition-colors shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                <HardHat className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-bold">Équipements EPI</CardTitle>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
              <Link href="/epi">
                Voir <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link href="/epi" className="rounded-lg border border-border p-2 bg-accent/20 hover:bg-accent/40 transition-colors">
                <p className="text-muted-foreground text-[10px]">Expirés</p>
                <p className={`text-lg font-bold ${epiKpi.expires > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {epiKpi.expires}
                </p>
              </Link>

              <Link href="/epi" className="rounded-lg border border-border p-2 bg-accent/20 hover:bg-accent/40 transition-colors">
                <p className="text-muted-foreground text-[10px]">À renouveler ce mois</p>
                <p className="text-lg font-bold text-amber-600">{epiKpi.echeanceMois}</p>
              </Link>
            </div>

            <div className="flex flex-col gap-1.5 text-xs pt-1 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Défectueux / Endommagés :</span>
                <strong className={epiKpi.defectueux > 0 ? "text-rose-600" : ""}>{epiKpi.defectueux}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">En service conforme :</span>
                <span className="font-semibold text-emerald-600">{epiKpi.enService}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==================================================================
         * 3. MOTEUR CAPA
         * ================================================================== */}
        <Card className="border-border bg-card hover:border-border/80 transition-colors shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
                <Wrench className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-bold">Actions Correctives (CAPA)</CardTitle>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
              <Link href="/actions">
                Voir <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <div className="rounded-lg border border-border p-1.5 bg-accent/20">
                <p className="text-[10px] text-muted-foreground">Retard</p>
                <p className={`text-base font-bold ${capaKpi.enRetard > 0 ? "text-rose-600" : ""}`}>
                  {capaKpi.enRetard}
                </p>
              </div>

              <div className="rounded-lg border border-border p-1.5 bg-accent/20">
                <p className="text-[10px] text-muted-foreground">Bloquées</p>
                <p className={`text-base font-bold ${capaKpi.bloquees > 0 ? "text-rose-600" : ""}`}>
                  {capaKpi.bloquees}
                </p>
              </div>

              <div className="rounded-lg border border-border p-1.5 bg-accent/20">
                <p className="text-[10px] text-muted-foreground">À vérifier</p>
                <p className="text-base font-bold text-amber-600">{capaKpi.aVerifier}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-xs pt-1 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Taux Efficacité :</span>
                <span className="font-semibold text-foreground">{capaKpi.tauxEfficaciteLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Taux Clôture :</span>
                <span className="font-semibold text-foreground">{capaKpi.tauxClotureLabel}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==================================================================
         * 4. INCIDENTS & INSPECTIONS
         * ================================================================== */}
        <Card className="border-border bg-card hover:border-border/80 transition-colors shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600">
                <Siren className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-bold">Incidents & Inspections</CardTitle>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
              <Link href="/incidents">
                Voir <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link href="/incidents" className="rounded-lg border border-border p-2 bg-accent/20 hover:bg-accent/40 transition-colors">
                <p className="text-muted-foreground text-[10px]">Incidents en cours</p>
                <p className="text-lg font-bold text-amber-600">{stats.incidentsEnCours}</p>
              </Link>

              <Link href="/inspections" className="rounded-lg border border-border p-2 bg-accent/20 hover:bg-accent/40 transition-colors">
                <p className="text-muted-foreground text-[10px]">Inspections terrain</p>
                <p className="text-lg font-bold text-foreground">{inspectionsKpi.completedCount}</p>
              </Link>
            </div>

            <div className="flex flex-col gap-1.5 text-xs pt-1 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Incidents critiques :</span>
                <strong className={stats.incidentsBySeverity.critique > 0 ? "text-rose-600" : ""}>
                  {stats.incidentsBySeverity.critique ?? 0}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Inspections sous 80% :</span>
                <span className={inspectionsKpi.nonConformes > 0 ? "text-amber-600 font-semibold" : ""}>
                  {inspectionsKpi.nonConformes}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==================================================================
         * 5. AUDITS QHSE (PHASE N)
         * ================================================================== */}
        <Card className="border-border bg-card hover:border-border/80 transition-colors shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-bold">Audits QHSE & Preuves</CardTitle>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
              <Link href="/audits">
                Voir <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link href="/audits" className="rounded-lg border border-border p-2 bg-accent/20 hover:bg-accent/40 transition-colors">
                <p className="text-muted-foreground text-[10px]">Audits actifs</p>
                <p className="text-lg font-bold text-foreground">{auditsKpi.actifs}</p>
              </Link>

              <Link href="/audits" className="rounded-lg border border-border p-2 bg-accent/20 hover:bg-accent/40 transition-colors">
                <p className="text-muted-foreground text-[10px]">Points Non Conformes</p>
                <p className={`text-lg font-bold ${auditsKpi.pointsNc > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {auditsKpi.pointsNc}
                </p>
              </Link>
            </div>

            <div className="flex flex-col gap-1.5 text-xs pt-1 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Preuves manquantes :</span>
                <strong className={auditsKpi.preuvesManquantes > 0 ? "text-amber-600" : ""}>
                  {auditsKpi.preuvesManquantes}
                </strong>
              </div>
              <div className="flex items-center justify-between pt-1">
                <Button asChild variant="outline" size="sm" className="h-6 text-[10px] w-full bg-accent/30">
                  <Link href="/audits">
                    <Eye className="h-3 w-3 mr-1 text-primary" />
                    Mode &quot;Montrez-moi la preuve&quot;
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==================================================================
         * 6. CONTRÔLE DOCUMENTAIRE GED
         * ================================================================== */}
        <Card className="border-border bg-card hover:border-border/80 transition-colors shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600">
                <FileText className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-bold">GED / Contrôle Doc</CardTitle>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
              <Link href="/documents">
                Voir <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link href="/documents" className="rounded-lg border border-border p-2 bg-accent/20 hover:bg-accent/40 transition-colors">
                <p className="text-muted-foreground text-[10px]">En révision</p>
                <p className="text-lg font-bold text-foreground">{gedKpi.enRevision}</p>
              </Link>

              <Link href="/documents" className="rounded-lg border border-border p-2 bg-accent/20 hover:bg-accent/40 transition-colors">
                <p className="text-muted-foreground text-[10px]">Revue sous 30j</p>
                <p className="text-lg font-bold text-amber-600">{gedKpi.echeanceRevue}</p>
              </Link>
            </div>

            <div className="flex flex-col gap-1.5 text-xs pt-1 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Signatures en attente :</span>
                <strong className={gedKpi.signaturesEnAttente > 0 ? "text-amber-600" : ""}>
                  {gedKpi.signaturesEnAttente}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total fonds documentaire :</span>
                <span className="font-semibold text-foreground">{gedKpi.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
