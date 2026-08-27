import { AlertTriangle, CheckCircle2, ClipboardList, Siren } from "lucide-react";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { getCockpitData } from "@/lib/services/cockpit.service";
import { CockpitSection } from "@/components/dashboard/cockpit-section";
import { StatCard } from "@/components/dashboard/stat-card";
import { DistributionBar } from "@/components/dashboard/distribution-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_LABELS, SEVERITY_LABELS, STATUS_LABELS } from "@/lib/types/incidents";
import { ACTION_STATUS_LABELS } from "@/lib/types/actions";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const cockpitData = await getCockpitData();
  const { urgentItems, aTraiterItems, infoItems, stats } = cockpitData;

  return (
    <div className="space-y-8">
      {/* En-tête du Dashboard */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cockpit QHSE</h1>
          <p className="text-sm text-muted-foreground">
            Bienvenue{profile?.fullName ? `, ${profile.fullName}` : ""}. Vue d&apos;ensemble et décisions prioritaires.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Mise à jour en temps réel
        </div>
      </div>

      {/* Cartes de synthèse de haut niveau */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Incidents déclarés" value={stats.totalIncidents} icon={Siren} />
        <StatCard
          label="Incidents en cours"
          value={stats.incidentsEnCours}
          icon={AlertTriangle}
          accent={stats.incidentsEnCours > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Actions en retard"
          value={stats.actionsEnRetard}
          icon={ClipboardList}
          accent={stats.actionsEnRetard > 0 ? "destructive" : "default"}
        />
        <StatCard
          label="Taux de résolution"
          value={`${stats.tauxResolution}%`}
          icon={CheckCircle2}
          accent="success"
        />
      </div>

      {/* ZONE CENTRALE : CE QUI NÉCESSITE MON ATTENTION */}
      <div className="space-y-6 rounded-xl border border-border bg-card/50 p-6 shadow-sm">
        <div className="space-y-1 border-b border-border pb-3">
          <h2 className="text-xl font-extrabold tracking-tight text-foreground">
            Ce qui nécessite mon attention
          </h2>
          <p className="text-xs text-muted-foreground">
            Hiérarchisation intelligente des situations, échéances et interventions prioritaires.
          </p>
        </div>

        <div className="space-y-8">
          {/* NIVEAU 🔴 URGENT */}
          <CockpitSection
            priority="urgent"
            title="URGENT"
            description="Situations critiques, incidents majeurs et actions en retard nécessitant une intervention immédiate."
            items={urgentItems}
          />

          {/* NIVEAU 🟠 À TRAITER */}
          <CockpitSection
            priority="a_traiter"
            title="À TRAITER"
            description="Échéances sous 7 jours, audits planifiés et contrôles d'équipements périodiques."
            items={aTraiterItems}
          />

          {/* NIVEAU 🟢 INFORMATION */}
          <CockpitSection
            priority="info"
            title="INFORMATION & TENDANCES"
            description="Signalements récents et actions clôturées."
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
              <CardTitle className="text-base font-semibold">Actions correctives par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <DistributionBar
                items={[
                  { label: ACTION_STATUS_LABELS.a_faire, value: stats.actionsByStatus.a_faire ?? 0, colorClassName: "bg-slate-400" },
                  { label: ACTION_STATUS_LABELS.en_cours, value: stats.actionsByStatus.en_cours ?? 0, colorClassName: "bg-amber-400" },
                  { label: ACTION_STATUS_LABELS.termine, value: stats.actionsByStatus.termine ?? 0, colorClassName: "bg-emerald-400" },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
