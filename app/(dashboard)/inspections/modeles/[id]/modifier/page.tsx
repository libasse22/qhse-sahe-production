import { notFound } from "next/navigation";
import { getInspectionTemplateById } from "@/lib/services/inspections.service";
import { TemplateBuilderForm } from "@/components/inspections/template-builder-form";

export default async function ModifierModeleChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getInspectionTemplateById(id);

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Modifier la Checklist : {template.title}</h1>
        <p className="text-sm text-muted-foreground">
          Modifiez les questions et la structure pour l&apos;adapter à votre contexte terrain.
        </p>
      </div>

      <TemplateBuilderForm initialData={template} />
    </div>
  );
}
