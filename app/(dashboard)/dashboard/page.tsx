import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardList, Siren } from "lucide-react";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { getDashboardStats } from "@/lib/services/stats.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { DistributionBar } from "@/components/dashboard/distribution-bar";
import { SeverityBadge } from "@/components/incidents/severity-badge";
import { IncidentStatusBadge } from "@/components/incidents/status-badge";
import { CATEGORY_LABELS, SEVERITY_LABELS, STATUS_LABELS } from "@/lib/types/incidents";
import { ACTION_STATUS_LABELS } from "@/lib/types/actions";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const stats = await getDashboardStats();

  const tauxResolution =
    stats.totalIncidents === 0
      ? 0
      : Math.round(((stats.incidentsByStatus.resolu + stats.incidentsByStatus.cloture) / stats.totalIncidents) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Bienvenue{profile?.fullName ? `, ${profile.fullName}` : ""}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Incidents déclarés" value={stats.totalIncidents} icon={Siren} />
        <StatCard
          label="Incidents en cours"
          value={stats.incidentsByStatus.en_cours}
          icon={AlertTriangle}
          accent="warning"
        />
        <StatCard
          label="Actions en retard"
          value={stats.actionsEnRetard}
          icon={ClipboardList}
          accent={stats.actionsEnRetard > 0 ? "destructive" : "default"}
        />
        <StatCard label="Taux de résolution" value={`${tauxResolution}%`} icon={CheckCircle2} accent="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Incidents par gravité</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionBar
              items={[
                { label: SEVERITY_LABELS.faible, value: stats.incidentsBySeverity.faible, colorClassName: "bg-emerald-400" },
                { label: SEVERITY_LABELS.moyenne, value: stats.incidentsBySeverity.moyenne, colorClassName: "bg-amber-400" },
                { label: SEVERITY_LABELS.elevee, value: stats.incidentsBySeverity.elevee, colorClassName: "bg-orange-500" },
                { label: SEVERITY_LABELS.critique, value: stats.incidentsBySeverity.critique, colorClassName: "bg-red-500" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidents par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionBar
              items={[
                { label: STATUS_LABELS.declare, value: stats.incidentsByStatus.declare, colorClassName: "bg-slate-400" },
                { label: STATUS_LABELS.en_cours, value: stats.incidentsByStatus.en_cours, colorClassName: "bg-amber-400" },
                { label: STATUS_LABELS.resolu, value: stats.incidentsByStatus.resolu, colorClassName: "bg-emerald-400" },
                { label: STATUS_LABELS.cloture, value: stats.incidentsByStatus.cloture, colorClassName: "bg-slate-600" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidents par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionBar
              items={Object.entries(stats.incidentsByCategory).map(([category, value]) => ({
                label: CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS],
                value,
                colorClassName: "bg-primary",
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions correctives par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionBar
              items={[
                { label: ACTION_STATUS_LABELS.a_faire, value: stats.actionsByStatus.a_faire, colorClassName: "bg-slate-400" },
                { label: ACTION_STATUS_LABELS.en_cours, value: stats.actionsByStatus.en_cours, colorClassName: "bg-amber-400" },
                { label: ACTION_STATUS_LABELS.termine, value: stats.actionsByStatus.termine, colorClassName: "bg-emerald-400" },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incidents récents</CardTitle>
          <CardDescription>Les 5 dernières déclarations visibles.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.incidentsRecents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun incident pour le moment.</p>
          ) : (
            <ul className="space-y-2">
              {stats.incidentsRecents.map((incident) => (
                <li key={incident.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0">
                  <Link href={`/incidents/${incident.id}`} className="text-sm font-medium hover:underline">
                    {incident.title}
                  </Link>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={incident.severity} />
                    <IncidentStatusBadge status={incident.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
