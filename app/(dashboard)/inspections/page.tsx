import Link from "next/link";
import { CheckSquare, Plus, FileText, Calendar, CheckCircle2, AlertTriangle, Settings2, Play } from "lucide-react";
import { listInspectionTemplates, listInspectionRuns } from "@/lib/services/inspections.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function InspectionsPage() {
  const templates = await listInspectionTemplates();
  const runs = await listInspectionRuns();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-primary" />
            Inspections & Checklists Terrain
          </h1>
          <p className="text-sm text-muted-foreground">
            Réalisez des contrôles terrain et créez des modèles de checklists personnalisés adaptés à votre entreprise.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="lg" className="font-semibold">
            <Link href="/inspections/modeles/nouveau">
              <Settings2 className="mr-2 h-5 w-5 text-primary" />
              Créer une checklist sur-mesure
            </Link>
          </Button>
          <Button asChild size="lg" className="font-semibold shadow-sm">
            <Link href="/inspections/nouvelle">
              <Plus className="mr-2 h-5 w-5" />
              Lancer une inspection
            </Link>
          </Button>
        </div>
      </div>

      {/* SECTION 1 : MODÈLES DE CHECKLISTS DISPONIBLES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Modèles de Checklists de l&apos;Entreprise</h2>
            <p className="text-xs text-muted-foreground">
              Sélectionnez une checklist pour démarrer une inspection ou modifiez ses points de contrôle.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link href="/inspections/modeles/nouveau">+ Nouveau modèle</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col justify-between transition-all duration-200 hover:border-primary/50 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-xs font-semibold">
                    {tpl.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {tpl.items.length} points
                  </span>
                </div>
                <CardTitle className="text-base font-semibold mt-2">{tpl.title}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs">
                  {tpl.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="secondary" size="sm" className="text-xs font-semibold gap-1">
                    <Link href={`/inspections/nouvelle?templateId=${tpl.id}`}>
                      <Play className="h-3.5 w-3.5" /> Démarrer
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="text-xs">
                    <Link href={`/inspections/modeles/${tpl.id}/modifier`}>
                      <Settings2 className="h-3.5 w-3.5 mr-1" /> Éditer
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* SECTION 2 : HISTORIQUE ET RAPPORTS D'INSPECTIONS */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-lg font-bold tracking-tight">Dernières Inspections Réalisées</h2>
        {runs.length === 0 ? (
          <Card className="border-dashed p-8 text-center bg-muted/20">
            <CheckSquare className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-3" />
            <p className="text-sm font-medium">Aucune inspection réalisée pour le moment.</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Sélectionnez un modèle ci-dessus pour réaliser votre premier contrôle terrain.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/inspections/nouvelle">Lancer une inspection</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => {
              const answersList = Object.values(run.answers);
              const total = answersList.length;
              const nonConformes = answersList.filter((a) => a.status === "non_conforme").length;
              const conformes = answersList.filter((a) => a.status === "conforme").length;

              return (
                <Card key={run.id} className="transition-all duration-200 hover:shadow-sm">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/inspections/${run.id}`} className="font-bold text-base hover:underline">
                          {run.title}
                        </Link>
                        <Badge variant={nonConformes > 0 ? "destructive" : "success"} className="text-xs">
                          {nonConformes > 0 ? `${nonConformes} Non-conformité(s)` : "100% Conforme"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          Inspecteur : {run.inspectorName || "Non renseigné"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(run.completedAt).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 border-t border-border pt-2 sm:border-t-0 sm:pt-0">
                      <div className="flex items-center gap-3 text-xs font-medium">
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" /> {conformes}/{total} ok
                        </span>
                        {nonConformes > 0 && (
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold">
                            <AlertTriangle className="h-4 w-4" /> {nonConformes} écart(s)
                          </span>
                        )}
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/inspections/${run.id}`}>Voir le rapport</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
