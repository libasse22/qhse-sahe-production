import { redirect, notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { getWorkPermitTemplateById } from "@/lib/services/permit-templates.service";
import { TemplateBuilderForm } from "@/components/permits/template-builder-form";

interface EditTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWorkPermitTemplatePage({ params }: EditTemplatePageProps) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const permissions = await getCurrentPermissions();

  if (!profile) redirect("/login");

  if (
    !permissions.has("permits.templates.view") &&
    !permissions.has("permits.view") &&
    profile.role !== "admin" &&
    profile.role !== "manager_qhse"
  ) {
    redirect("/parametres/permis-de-travail/modeles");
  }

  const template = await getWorkPermitTemplateById(id);
  if (!template) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <TemplateBuilderForm initialTemplate={template} />
    </div>
  );
}
