import { redirect } from "next/navigation";
import { getInspectionTemplateById, listInspectionTemplates } from "@/lib/services/inspections.service";
import { InspectionRunForm } from "@/components/inspections/inspection-run-form";

export default async function NouvelleInspectionPage({
  searchParams,
}: {
  searchParams: Promise<{ templateId?: string }>;
}) {
  const resolvedParams = await searchParams;
  let templateId = resolvedParams.templateId;

  if (!templateId) {
    const templates = await listInspectionTemplates();
    if (templates.length > 0 && templates[0]) {
      templateId = templates[0].id;
    } else {
      templateId = "default-0";
    }
  }

  const template = await getInspectionTemplateById(templateId);

  if (!template) {
    redirect("/inspections");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Réalisation d&apos;une Inspection Terrain</h1>
        <p className="text-sm text-muted-foreground">
          Remplissez la checklist ci-dessous. Toute non-conformité générera automatiquement une action corrective.
        </p>
      </div>

      <InspectionRunForm template={template} />
    </div>
  );
}
