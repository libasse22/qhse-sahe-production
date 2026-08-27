"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, HelpCircle, Send, CheckSquare } from "lucide-react";
import { createInspectionRun, type InspectionTemplate, type InspectionAnswer } from "@/lib/services/inspections.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function InspectionRunForm({ template }: { template: InspectionTemplate }) {
  const router = useRouter();
  const [title, setTitle] = useState(template.title);
  const [answers, setAnswers] = useState<Record<string, InspectionAnswer>>(() => {
    const initial: Record<string, InspectionAnswer> = {};
    template.items.forEach((item) => {
      initial[item.id] = { status: "conforme", comment: "" };
    });
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleStatusChange(itemId: string, status: "conforme" | "non_conforme" | "na") {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], status },
    }));
  }

  function handleCommentChange(itemId: string, comment: string) {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], status: prev[itemId]?.status ?? "conforme", comment },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    const result = await createInspectionRun({
      templateId: template.id,
      title,
      answers,
      createActionsForNonConformities: true,
    });

    if (result.error || !result.runId) {
      setError(result.error ?? "Erreur lors de l'enregistrement de l'inspection.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/inspections/${result.runId}`);
  }

  const nonConformitiesCount = Object.values(answers).filter((a) => a.status === "non_conforme").length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <Badge variant="outline">{template.category}</Badge>
          </div>
          <CardTitle className="text-xl mt-1">Titre de l&apos;inspection</CardTitle>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="text-lg font-semibold"
          />
          <CardDescription>{template.description}</CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Points de contrôle ({template.items.length})</h3>

        {template.items.map((item, index) => {
          const currentAnswer = answers[item.id] || { status: "conforme", comment: "" };

          return (
            <Card
              key={item.id}
              className={`transition-all ${
                currentAnswer.status === "non_conforme"
                  ? "border-l-4 border-l-red-500 bg-red-500/5 dark:bg-red-950/20"
                  : currentAnswer.status === "conforme"
                  ? "border-l-4 border-l-emerald-500"
                  : "border-l-4 border-l-slate-400"
              }`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      #{index + 1}
                    </span>
                    <h4 className="font-semibold text-base">
                      {item.label}
                      {item.required && <span className="text-red-500 ml-1">*</span>}
                    </h4>
                  </div>

                  {/* BOUTONS D'ÉVALUATION */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant={currentAnswer.status === "conforme" ? "default" : "outline"}
                      onClick={() => handleStatusChange(item.id, "conforme")}
                      className="gap-1 font-semibold"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Conforme
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant={currentAnswer.status === "non_conforme" ? "destructive" : "outline"}
                      onClick={() => handleStatusChange(item.id, "non_conforme")}
                      className="gap-1 font-semibold"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Non conforme
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant={currentAnswer.status === "na" ? "secondary" : "outline"}
                      onClick={() => handleStatusChange(item.id, "na")}
                      className="gap-1 text-xs"
                    >
                      <HelpCircle className="h-4 w-4" />
                      N/A
                    </Button>
                  </div>
                </div>

                {/* Saisie de commentaire / détails sur non-conformité */}
                <Textarea
                  value={currentAnswer.comment ?? ""}
                  onChange={(e) => handleCommentChange(item.id, e.target.value)}
                  rows={currentAnswer.status === "non_conforme" ? 2 : 1}
                  placeholder={
                    currentAnswer.status === "non_conforme"
                      ? "Précisez l'écart constaté et la mesure requise (action corrective automatique)..."
                      : "Remarque éventuelle (facultatif)..."
                  }
                  className={currentAnswer.status === "non_conforme" ? "border-red-300 dark:border-red-800" : ""}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {nonConformitiesCount > 0 && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 text-amber-900 dark:text-amber-300 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-xs font-medium">
            <strong>{nonConformitiesCount} non-conformité(s)</strong> détectée(s). La validation de cette inspection générera automatiquement des actions correctives assignées.
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="lg" disabled={isSubmitting} className="font-bold gap-2">
          <Send className="h-5 w-5" />
          {isSubmitting ? "Enregistrement..." : "Valider l'inspection"}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
