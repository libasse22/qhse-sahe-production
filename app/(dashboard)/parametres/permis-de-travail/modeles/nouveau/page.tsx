import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { TemplateBuilderForm } from "@/components/permits/template-builder-form";

export default async function NewWorkPermitTemplatePage() {
  const profile = await getCurrentProfile();
  const permissions = await getCurrentPermissions();

  if (!profile) redirect("/login");

  if (
    !permissions.has("permits.templates.create") &&
    !permissions.has("permits.templates.edit") &&
    profile.role !== "admin" &&
    profile.role !== "manager_qhse"
  ) {
    redirect("/parametres/permis-de-travail/modeles");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <TemplateBuilderForm />
    </div>
  );
}
