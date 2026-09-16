"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Calendar,
  Printer,
  Download,
  FolderPlus,
  AlertTriangle,
  Siren,
  ClipboardCheck,
  ClipboardList,
  FileCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { QhseReportData } from "@/lib/services/qhse-reporting.service";
import { saveQhseReportToGed } from "@/lib/services/qhse-reporting.service";
import { exportQhseReportToCsv } from "@/lib/csv-export";

interface QhseReportingViewProps {
  initialReport: QhseReportData;
  initialStartDate: string;
  initialEndDate: string;
}

export function QhseReportingView({
  initialReport,
  initialStartDate,
  initialEndDate,
}: QhseReportingViewProps) {
  const [report] = useState<QhseReportData>(initialReport);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [isPending, startTransition] = useTransition();
  const [gedMessage, setGedMessage] = useState<{ success?: string; error?: string } | null>(null);

  function handlePeriodChange(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => {
      // Reload page with new query params
      window.location.href = `/rapports-qhse?start=${startDate}&end=${endDate}`;
    });
  }

  async function handleArchiveToGed() {
    setGedMessage(null);
    startTransition(async () => {
      const res = await saveQhseReportToGed({ reportData: report });
      if (res.error) {
        setGedMessage({ error: res.error });
      } else {
        setGedMessage({
          success: `Rapport archivé avec succès dans la GED sous la référence ${res.codeReference || "DOC-RPT"}.`,
        });
      }
    });
  }

  const printUrl = `/rapports-qhse/impression?start=${startDate}&end=${endDate}`;

  return (
    <div className="space-y-6">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-primary uppercase bg-primary/10 px-2 py-0.5 rounded">
              Reporting QHSE Duo
            </span>
            <span className="text-xs text-muted-foreground">{report.companyName}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Bilan & Reporting Mensuel QHSE</h1>
          <p className="text-xs text-muted-foreground">
            Synthèse consolidée multi-domaines pour la direction, les auditeurs ISO et les responsables sécurité.
          </p>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href={printUrl} target="_blank">
            <Button variant="default" className="gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 font-bold">
              <Printer className="h-4 w-4" /> Imprimer / Exporter PDF (A4)
            </Button>
          </Link>
          <Button variant="outline" onClick={handleArchiveToGed} disabled={isPending} className="gap-2">
            <FolderPlus className="h-4 w-4 text-emerald-600" /> Archiver dans la GED
          </Button>
          <Button variant="outline" onClick={() => exportQhseReportToCsv(report)} className="gap-2">
            <Download className="h-4 w-4 text-blue-600" /> Exporter CSV (Excel)
          </Button>
        </div>
      </div>

      {gedMessage && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            gedMessage.error
              ? "bg-destructive/10 border-destructive/30 text-destructive"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
          }`}
        >
          <span>{gedMessage.error || gedMessage.success}</span>
          {gedMessage.success && (
            <Link href="/documents" className="font-bold underline ml-2">
              Consulter la GED →
            </Link>
          )}
        </div>
      )}

      {/* SÉLECTEUR DE PÉRIODE */}
      <Card className="border-border bg-card">
        <CardContent className="pt-4 pb-4">
          <form onSubmit={handlePeriodChange} className="flex flex-col sm:flex-row items-end gap-3">
            <div className="space-y-1 flex-1 w-full">
              <label className="text-xs font-semibold text-muted-foreground block">Date Début Bilan</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1 flex-1 w-full">
              <label className="text-xs font-semibold text-muted-foreground block">Date Fin Bilan</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <Button type="submit" disabled={isPending} size="sm" className="h-9 gap-1.5 w-full sm:w-auto">
              <Calendar className="h-4 w-4" /> Recalculer le Rapport
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* SYNTHÈSE EXÉCUTIVE - SCORE GLOBAL */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Synthèse Exécutive & Score de Conformité Global
            </span>
            <Badge
              variant={
                report.globalStatus === "CONFORME"
                  ? "success"
                  : report.globalStatus === "CRITIQUE"
                  ? "destructive"
                  : report.globalStatus === "ATTENTION"
                  ? "warning"
                  : "secondary"
              }
              className="text-xs font-black uppercase"
            >
              {report.globalStatus === "CONFORME"
                ? "🟢 GLOBALEMENT CONFORME"
                : report.globalStatus === "ATTENTION"
                ? "🟠 VIGILANCE REQUISE"
                : report.globalStatus === "CRITIQUE"
                ? "🔴 SITUATION CRITIQUE"
                : "⚪ EVALUATION N/A"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="md:col-span-1 text-center md:text-left border-r border-border/50 pr-4">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Score Global Sécurité</span>
              <div className="text-4xl font-black text-foreground mt-1">
                {report.globalComplianceScore !== null ? `${report.globalComplianceScore}%` : "N/A"}
              </div>
              <span className="text-[11px] text-muted-foreground block mt-1">
                {report.globalComplianceScore !== null
                  ? "Moyenne pondérée des indicateurs de la période"
                  : "Aucune donnée suffisante sur la période"}
              </span>
            </div>

            <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border bg-card">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">Traitement Incidents</span>
                <span className="font-extrabold text-sm block mt-0.5">
                  {report.incidents.tauxTraitement.value}
                </span>
                <span className="text-[10px] text-muted-foreground">{report.incidents.total.value} incidents au total</span>
              </div>

              <div className="p-3 rounded-lg border bg-card">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">Conformité Checklists</span>
                <span className="font-extrabold text-sm block mt-0.5">
                  {report.inspections.tauxConformite.value}
                </span>
                <span className="text-[10px] text-muted-foreground">{report.inspections.total.value} inspections réalisées</span>
              </div>

              <div className="p-3 rounded-lg border bg-card">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">Clôture Actions CAPA</span>
                <span className="font-extrabold text-sm block mt-0.5">
                  {report.capa.tauxCloture.value}
                </span>
                <span className="text-[10px] text-muted-foreground">{report.capa.total.value} actions ouvertes/suivies</span>
              </div>

              <div className="p-3 rounded-lg border bg-card">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">Conformité EPI</span>
                <span className="font-extrabold text-sm block mt-0.5">
                  {report.epi.tauxConformite.value}
                </span>
                <span className="text-[10px] text-muted-foreground">{report.epi.totalAttribues.value} dotations enregistrées</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ANOMALIES & POINTS D'ATTENTION PRIORITAIRES */}
      {report.attentionPoints.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Points d&apos;Attention Prioritaires pour la Direction ({report.attentionPoints.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {report.attentionPoints.map((pt) => (
              <div key={pt.id} className="p-2.5 rounded border border-red-500/20 bg-card flex items-start gap-2.5">
                <Badge variant={pt.severity === "CRITICAL" ? "destructive" : "warning"} className="text-[9px] uppercase shrink-0 mt-0.5">
                  {pt.domain} — {pt.severity}
                </Badge>
                <div>
                  <span className="font-bold text-foreground block">{pt.title}</span>
                  <span className="text-muted-foreground text-[11px] block mt-0.5">{pt.description}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* MODULE CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. INCIDENTS */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Siren className="h-4 w-4 text-rose-500" />
                1. Incidents & Événements QHSE
              </span>
              <Badge variant="outline" className="text-[10px]">
                {report.incidents.total.value} incidents
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded bg-muted/40 border">
                <span className="text-[9px] font-bold uppercase text-muted-foreground block">Faible</span>
                <span className="font-bold text-sm text-foreground">{report.incidents.faible}</span>
              </div>
              <div className="p-2 rounded bg-muted/40 border">
                <span className="text-[9px] font-bold uppercase text-amber-600 block">Moyenne</span>
                <span className="font-bold text-sm text-amber-700 dark:text-amber-400">{report.incidents.moyenne}</span>
              </div>
              <div className="p-2 rounded bg-muted/40 border">
                <span className="text-[9px] font-bold uppercase text-orange-600 block">Élevée</span>
                <span className="font-bold text-sm text-orange-700 dark:text-orange-400">{report.incidents.elevee}</span>
              </div>
              <div className="p-2 rounded bg-muted/40 border">
                <span className="text-[9px] font-bold uppercase text-rose-600 block">Critique</span>
                <span className="font-bold text-sm text-rose-700 dark:text-rose-400">{report.incidents.critique}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground font-medium">Taux de résolution / traitement :</span>
              <span className="font-extrabold text-foreground">{report.incidents.tauxTraitement.value}</span>
            </div>
          </CardContent>
        </Card>

        {/* 2. INSPECTIONS */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                2. Inspections & Contrôles Terrain
              </span>
              <Badge variant="outline" className="text-[10px]">
                {report.inspections.total.value} réalisées
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 block">Conformes</span>
                <span className="font-bold text-base text-emerald-700 dark:text-emerald-400">{report.inspections.conformesCount}</span>
              </div>
              <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 block">Non-Conformités</span>
                <span className="font-bold text-base text-amber-700 dark:text-amber-400">{report.inspections.nonConformesCount}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground font-medium">Taux de conformité des points contrôlés :</span>
              <span className="font-extrabold text-foreground">{report.inspections.tauxConformite.value}</span>
            </div>
          </CardContent>
        </Card>

        {/* 3. CAPA */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-blue-600" />
                3. Actions Correctives (CAPA)
              </span>
              <Badge variant="outline" className="text-[10px]">
                {report.capa.total.value} actions
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-muted/40 border">
                <span className="text-[9px] font-bold uppercase text-muted-foreground block">Clôturées</span>
                <span className="font-bold text-sm text-emerald-600">{report.capa.cloturees}</span>
              </div>
              <div className="p-2 rounded bg-muted/40 border">
                <span className="text-[9px] font-bold uppercase text-red-600 block">Bloquées</span>
                <span className="font-bold text-sm text-red-600">{report.capa.bloquees}</span>
              </div>
              <div className="p-2 rounded bg-muted/40 border">
                <span className="text-[9px] font-bold uppercase text-amber-600 block">En Retard</span>
                <span className="font-bold text-sm text-amber-600">{report.capa.enRetard}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground font-medium">Taux de clôture global :</span>
              <span className="font-extrabold text-foreground">{report.capa.tauxCloture.value}</span>
            </div>
          </CardContent>
        </Card>

        {/* 4. PERMIS & EPI */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-amber-600" />
                4. Permis de Travail (PtW) & EPI
              </span>
              <Badge variant="outline" className="text-[10px]">
                {report.permits.total.value} PTW / {report.epi.totalAttribues.value} EPI
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded border bg-muted/20 space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">Permis de Travail (PtW)</span>
                <div className="flex justify-between items-center text-[11px]">
                  <span>En cours (Actifs) :</span>
                  <span className="font-bold">{report.permits.actifs}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span>Suspendus :</span>
                  <span className="font-bold text-amber-600">{report.permits.suspendus}</span>
                </div>
              </div>

              <div className="p-2.5 rounded border bg-muted/20 space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">Dotations EPI</span>
                <div className="flex justify-between items-center text-[11px]">
                  <span>En service :</span>
                  <span className="font-bold">{report.epi.enService}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span>Défectueux / À Remplacer :</span>
                  <span className="font-bold text-red-600">{report.epi.defectueux}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground font-medium">Conformité dotations EPI :</span>
              <span className="font-extrabold text-foreground">{report.epi.tauxConformite.value}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
