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

export default async function DashboardPage() {
  const [profile, cockpitData, dashboardStats] = await Promise.all([
    getCurrentProfile(),
    getCockpitData(),
    getDashboardStats(),
  ]);

  const { urgentItems, aTraiterItems, infoItems, stats } = cockpitData;

  return (
    <div className="space-y-8">
      {/* En-tête du Dashboard */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cockpit QHSE & Moteur CAPA</h1>
          <p className="text-sm text-muted-foreground">
            Bienvenue{profile?.fullName ? `, ${profile.fullName}` : ""}. Vue d&apos;ensemble, arbitrage et pilotage d&apos;efficacité.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Moteur CAPA Actif & Audité
        </div>
      </div>

      {/* Cartes de synthèse de haut niveau */}
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
          value={`${dashboardStats.tauxEfficacite}%`}
          icon={ShieldCheck}
          accent="success"
        />
      </div>

      {/* INDICE DE PERFORMANCE CAPA */}
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

      {/* ZONE CENTRALE : CE QUI NÉCESSITE MON ATTENTION */}
      <div className="space-y-6 rounded-xl border border-border bg-card/50 p-6 shadow-sm">
        <div className="space-y-1 border-b border-border pb-3">
          <h2 className="text-xl font-extrabold tracking-tight text-foreground">
            Ce qui nécessite mon attention
          </h2>
          <p className="text-xs text-muted-foreground">
            Hiérarchisation intelligente des situations, blocages, échéances et contrôles d&apos;efficacité.
          </p>
        </div>

        <div className="space-y-8">
          {/* NIVEAU 🔴 URGENT */}
          <CockpitSection
            priority="urgent"
            title="URGENT & BLOQUÉ"
            description="Situations critiques, actions bloquées et dépassements d'échéance nécessitant un arbitrage immédiat."
            items={urgentItems}
          />

          {/* NIVEAU 🟠 À TRAITER */}
          <CockpitSection
            priority="a_traiter"
            title="À TRAITER & À VÉRIFIER"
            description="Actions soumises pour vérification d'efficacité, échéances sous 7 jours et audits planifiés."
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

      {/* REPARTITIONS & RAPPORTS DE SYNTHÈSE */}
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
