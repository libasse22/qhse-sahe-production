import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertTriangle, HelpCircle, FileText, Calendar } from "lucide-react";
import { getInspectionRunById } from "@/lib/services/inspections.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function InspectionReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await getInspectionRunById(id);

  if (!run) {
    notFound();
  }

  const answersList = Object.entries(run.answers);
  const total = answersList.length;
  const nonConformes = answersList.filter(([, a]) => a.status === "non_conforme");
  const conformes = answersList.filter(([, a]) => a.status === "conforme");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href="/inspections">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux inspections
          </Link>
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{run.title}</h1>
          <Badge variant={nonConformes.length > 0 ? "destructive" : "success"} className="text-sm px-3 py-1">
            {nonConformes.length > 0 ? `${nonConformes.length} Non-conformité(s)` : "100% Conforme"}
          </Badge>
        </div>
      </div>

      {/* METADONNEES & DECOMPTE */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Date de réalisation</p>
              <p className="text-sm font-semibold">
                {new Date(run.completedAt).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Inspecteur</p>
              <p className="text-sm font-semibold">{run.inspectorName || "Non renseigné"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">Résultat</p>
              <p className="text-sm font-semibold">
                {conformes.length} / {total} points conformes
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RÉSULTATS DÉTAILLÉS PAR POINT */}
      <Card>
        <CardHeader>
          <CardTitle>Détail des points de contrôle</CardTitle>
          <CardDescription>Résultats enregistrés lors de l&apos;inspection terrain.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {answersList.map(([itemId, answer], index) => (
            <div
              key={itemId}
              className={`p-4 rounded-lg border ${
                answer.status === "non_conforme"
                  ? "border-red-300 bg-red-500/5 dark:border-red-800"
                  : answer.status === "conforme"
                  ? "border-emerald-200 bg-emerald-500/5 dark:border-emerald-900"
                  : "border-slate-200 bg-slate-500/5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-muted-foreground">
                    Point #{index + 1} ({itemId})
                  </span>
                  {answer.comment && (
                    <p className="text-sm mt-1 font-medium italic">
                      &laquo; {answer.comment} &raquo;
                    </p>
                  )}
                </div>

                <Badge
                  variant={
                    answer.status === "non_conforme"
                      ? "destructive"
                      : answer.status === "conforme"
                      ? "success"
                      : "secondary"
                  }
                  className="gap-1 font-semibold"
                >
                  {answer.status === "non_conforme" && <AlertTriangle className="h-3.5 w-3.5" />}
                  {answer.status === "conforme" && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {answer.status === "na" && <HelpCircle className="h-3.5 w-3.5" />}
                  {answer.status === "non_conforme"
                    ? "Non conforme"
                    : answer.status === "conforme"
                    ? "Conforme"
                    : "N/A"}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
