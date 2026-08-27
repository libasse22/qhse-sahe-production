"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, FileText, ListChecks } from "lucide-react";
import {
  createInspectionTemplate,
  updateInspectionTemplate,
  deleteInspectionTemplate,
  type InspectionTemplate,
  type ChecklistItem,
} from "@/lib/services/inspections.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface TemplateBuilderFormProps {
  initialData?: InspectionTemplate;
}

export function TemplateBuilderForm({ initialData }: TemplateBuilderFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "Chantier");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [items, setItems] = useState<ChecklistItem[]>(
    initialData?.items ?? [
      { id: "item_1", label: "Port des EPI obligatoires conforme", required: true },
      { id: "item_2", label: "Balisage des zones à risques en place", required: true },
    ],
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addItem() {
    const newId = `item_${Date.now()}`;
    setItems((prev) => [...prev, { id: newId, label: "", required: true }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) {
      alert("Une checklist doit contenir au moins un point de contrôle.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItemLabel(index: number, label: string) {
    setItems((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], label };
      }
      return copy;
    });
  }

  function updateItemRequired(index: number, required: boolean) {
    setItems((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], required };
      }
      return copy;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Le titre de la checklist est obligatoire.");
      return;
    }

    const validItems = items.filter((it) => it.label.trim().length > 0);
    if (validItems.length === 0) {
      setError("Ajoutez au moins un point de contrôle valide.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let result;
    if (initialData?.id && !initialData.id.startsWith("default-")) {
      result = await updateInspectionTemplate(initialData.id, {
        title,
        category,
        description,
        items: validItems,
      });
    } else {
      result = await createInspectionTemplate({
        title,
        category,
        description,
        items: validItems,
      });
    }

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    router.push("/inspections");
  }

  async function handleDelete() {
    if (!initialData?.id || initialData.id.startsWith("default-")) return;
    if (!confirm("Supprimer définitivement ce modèle de checklist ?")) return;

    setIsSubmitting(true);
    const res = await deleteInspectionTemplate(initialData.id);
    if (res.error) {
      setError(res.error);
      setIsSubmitting(false);
      return;
    }
    router.push("/inspections");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Informations Générales du Modèle
          </CardTitle>
          <CardDescription>
            Personnalisez le titre, le secteur d&apos;activité et la description de votre checklist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Titre de la checklist *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex : Inspection Hebdomadaire Atelier Métallurgie"
                required
                className="font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Catégorie / Secteur *
              </label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="ex : Chantier, Usine, Mines, EPI"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Description / Consignes d&apos;inspection
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Expliquez l'objectif de cette inspection et les consignes particulières..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* ÉDITION DES POINTS DE CONTRÔLE */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              Points de Contrôle ({items.length})
            </CardTitle>
            <CardDescription>
              Ajoutez et modifiez les questions ou éléments à vérifier sur le terrain.
            </CardDescription>
          </div>
          <Button type="button" onClick={addItem} variant="outline" size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Ajouter un point
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id || index}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card shadow-sm"
            >
              <span className="font-mono text-xs font-bold text-muted-foreground shrink-0 w-6">
                #{index + 1}
              </span>

              <Input
                value={item.label}
                onChange={(e) => updateItemLabel(index, e.target.value)}
                placeholder={`Point à contrôler n°${index + 1}...`}
                required
                className="flex-1"
              />

              <label className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.required ?? true}
                  onChange={(e) => updateItemRequired(index, e.target.checked)}
                  className="rounded border-input text-primary"
                />
                Obligatoire
              </label>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(index)}
                className="text-destructive hover:bg-destructive/10 shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button type="button" onClick={addItem} variant="outline" className="w-full mt-2 border-dashed gap-1 text-xs">
            <Plus className="h-4 w-4" /> Ajouter un nouveau point de contrôle
          </Button>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-lg bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={isSubmitting} className="font-bold gap-2">
            <Save className="h-5 w-5" />
            {isSubmitting ? "Enregistrement..." : "Enregistrer la checklist"}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
            Annuler
          </Button>
        </div>

        {initialData?.id && !initialData.id.startsWith("default-") && (
          <Button type="button" variant="destructive" size="lg" onClick={handleDelete} disabled={isSubmitting}>
            Supprimer ce modèle
          </Button>
        )}
      </div>
    </form>
  );
}
