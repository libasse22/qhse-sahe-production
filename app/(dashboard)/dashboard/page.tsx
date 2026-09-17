import { AlertTriangle, ClipboardList, Siren, ShieldCheck, Lock, Clock, RotateCcw } from "lucide-react";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { getCockpitData } from "@/lib/services/cockpit.service";
import { getDashboardStats } from "@/lib/services/stats.service";
import { CockpitSection } from "@/components/dashboard/cockpit-section";
import { StatCard } from "@/components/dashboard/stat-card";
import { DistributionBar } from "@/components/dashboard/distribution-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_LABELS, SEVERITY_LABELS, STATUS_LABELS } from "@/lib/types/incidents";
import { ACTION_STATUS_LABELS } from "@/lib/types/actions";
import { CockpitV3Header } from "@/components/dashboard/cockpit-v3-header";
import { CockpitKpiGrid } from "@/components/dashboard/cockpit-kpi-grid";
import { ExecutiveSummaryCard } from "@/components/dashboard/executive-summary-card";

export default async function DashboardPage() {
  const [profile, cockpitData, dashboardStats] = await Promise.all([
    getCurrentProfile(),
    getCockpitData(),
    getDashboardStats(),
  ]);

  const { urgentItems, aTraiterItems, infoItems, stats } = cockpitData;

  return (
    <div className="space-y-8">
      {/* 1. En-tête du Cockpit V3 */}
      <CockpitV3Header
        userName={profile?.fullName}
        companyName={(profile as any)?.company?.name}
        urgentCount={urgentItems.length}
        aTraiterCount={aTraiterItems.length}
      />

      {/* 2. Cartes de synthèse de haut niveau (CAPA & Incidents) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Incidents déclarés" value={stats.totalIncidents} icon={Siren} />
        <StatCard
          label="Actions en retard"
          value={stats.actionsEnRetard}
          icon={ClipboardList}
          accent={stats.actionsEnRetard > 0 ? "destructive" : "default"}
        />
        <StatCard
          label="Actions bloquées"
          value={dashboardStats.actionsBloquees}
          icon={Lock}
          accent={dashboardStats.actionsBloquees > 0 ? "destructive" : "default"}
        />
        <StatCard
          label="Taux d'efficacité CAPA"
          value={cockpitData.capaKpi.tauxEfficaciteLabel}
          icon={ShieldCheck}
          accent="success"
        />
      </div>

      {/* 3. INDICE DE PERFORMANCE CAPA */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Aging Moyen des Actions</p>
            <p className="text-lg font-bold font-mono text-foreground">{dashboardStats.agingMoyenJours} jours</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Actions à Vérifier</p>
            <p className="text-lg font-bold font-mono text-foreground">{dashboardStats.actionsAVerifier}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Récidives (Actions Filles)</p>
            <p className="text-lg font-bold font-mono text-foreground">{dashboardStats.actionsRecidives}</p>
          </div>
        </div>
      </div>

      {/* 4. ZONE CENTRALE : CE QUI NÉCESSITE MON ATTENTION (URGENT / À TRAITER / INFO) */}
      <div className="space-y-6 rounded-xl border border-border bg-card/50 p-6 shadow-sm">
        <div className="space-y-1 border-b border-border pb-3">
          <h2 className="text-xl font-extrabold tracking-tight text-foreground">
            Ce qui nécessite mon attention
          </h2>
          <p className="text-xs text-muted-foreground">
            Hiérarchisation urgente des situations critiques, blocages, permis à risque, EPI et contrôles d&apos;efficacité.
          </p>
        </div>

        <div className="space-y-8">
          {/* NIVEAU 🔴 URGENT */}
          <CockpitSection
            priority="urgent"
            title="URGENT & BLOQUÉ"
            description="Situations critiques, actions bloquées, permis expirant < 2h et dépassements d'échéance nécessitant un arbitrage immédiat."
            items={urgentItems}
          />

          {/* NIVEAU 🟠 À TRAITER */}
          <CockpitSection
            priority="a_traiter"
            title="À TRAITER & À VÉRIFIER"
            description="Permis en attente de validation, actions à vérifier, contrôles EPI et audits planifiés sous 7 jours."
            items={aTraiterItems}
          />

          {/* NIVEAU 🟢 INFORMATION */}
          <CockpitSection
            priority="info"
            title="INFORMATION & TENDANCES"
            description="Signalements récents et actions clôturées avec succès."
            items={infoItems}
          />
        </div>
      </div>

      {/* 5. BLOCS KPI MÉTIER COMPACTS (PtW, EPI, CAPA, Audits/Inspections, GED) */}
      <CockpitKpiGrid data={cockpitData} />

      {/* 6. SYNTHÈSE DIRECTION FACTUELLE */}
      <ExecutiveSummaryCard data={cockpitData} companyName={(profile as any)?.company?.name} />

      {/* 7. RÉPARTITIONS GLOBALES DES DONNÉES */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold tracking-tight">Répartition globale des données</h3>
        
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Incidents par gravité</CardTitle>
            </CardHeader>
            <CardContent>
              <DistributionBar
                items={[
                  { label: SEVERITY_LABELS.faible, value: stats.incidentsBySeverity.faible ?? 0, colorClassName: "bg-emerald-400" },
                  { label: SEVERITY_LABELS.moyenne, value: stats.incidentsBySeverity.moyenne ?? 0, colorClassName: "bg-amber-400" },
                  { label: SEVERITY_LABELS.elevee, value: stats.incidentsBySeverity.elevee ?? 0, colorClassName: "bg-orange-500" },
                  { label: SEVERITY_LABELS.critique, value: stats.incidentsBySeverity.critique ?? 0, colorClassName: "bg-red-500" },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Incidents par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <DistributionBar
                items={[
                  { label: STATUS_LABELS.declare, value: stats.incidentsByStatus.declare ?? 0, colorClassName: "bg-slate-400" },
                  { label: STATUS_LABELS.en_cours, value: stats.incidentsByStatus.en_cours ?? 0, colorClassName: "bg-amber-400" },
                  { label: STATUS_LABELS.resolu, value: stats.incidentsByStatus.resolu ?? 0, colorClassName: "bg-emerald-400" },
                  { label: STATUS_LABELS.cloture, value: stats.incidentsByStatus.cloture ?? 0, colorClassName: "bg-slate-600" },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Incidents par catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <DistributionBar
                items={Object.entries(stats.incidentsByCategory).map(([category, value]) => ({
                  label: CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category,
                  value,
                  colorClassName: "bg-primary",
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Actions CAPA par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <DistributionBar
                items={[
                  { label: ACTION_STATUS_LABELS.ouverte, value: dashboardStats.actionsByStatus.ouverte ?? 0, colorClassName: "bg-slate-400" },
                  { label: ACTION_STATUS_LABELS.en_cours, value: dashboardStats.actionsByStatus.en_cours ?? 0, colorClassName: "bg-amber-400" },
                  { label: ACTION_STATUS_LABELS.bloquee, value: dashboardStats.actionsByStatus.bloquee ?? 0, colorClassName: "bg-red-500" },
                  { label: ACTION_STATUS_LABELS.a_verifier, value: dashboardStats.actionsByStatus.a_verifier ?? 0, colorClassName: "bg-purple-500" },
                  { label: ACTION_STATUS_LABELS.cloturee, value: dashboardStats.actionsByStatus.cloturee ?? 0, colorClassName: "bg-emerald-400" },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
