"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/services/auth.service";
import type {
  WorkPermitTemplate,
  WorkPermitTemplateSnapshot,
} from "@/lib/types/permits";
import { DEFAULT_TEMPLATE_SNAPSHOT } from "@/lib/constants/permit-questionnaires";

export async function getDefaultTemplateSnapshot(): Promise<WorkPermitTemplateSnapshot> {
  return DEFAULT_TEMPLATE_SNAPSHOT;
}

export async function listWorkPermitTemplates(): Promise<WorkPermitTemplate[]> {
  const supabase = (await createClient()) as any;

  const { data: templates, error } = await supabase
    .from("work_permit_templates")
    .select(`
      *,
      active_versions:work_permit_template_versions(*)
    `)
    .order("created_at", { ascending: false });

  if (error || !templates) {
    if (error) {
      console.error("Error listing permit templates:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
    }
    return [];
  }

  return templates.map((t: any) => {
    const activeVersion = Array.isArray(t.active_versions)
      ? t.active_versions.find((v: any) => v.status === "actif") || t.active_versions[0]
      : null;

    return {
      id: t.id,
      companyId: t.company_id,
      name: t.name,
      description: t.description || "",
      code: t.code,
      versionMajor: t.version_major,
      versionMinor: t.version_minor,
      status: t.status,
      isDefault: t.is_default,
      createdBy: t.created_by,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      activeVersion: activeVersion
        ? {
            id: activeVersion.id,
            templateId: activeVersion.template_id,
            companyId: activeVersion.company_id,
            versionMajor: activeVersion.version_major,
            versionMinor: activeVersion.version_minor,
            versionLabel: activeVersion.version_label,
            status: activeVersion.status,
            configuration: activeVersion.configuration || DEFAULT_TEMPLATE_SNAPSHOT,
            createdBy: activeVersion.created_by,
            createdAt: activeVersion.created_at,
          }
        : null,
    };
  });
}

export async function getWorkPermitTemplateById(id: string): Promise<WorkPermitTemplate | null> {
  if (id === "default") {
    return {
      id: "default",
      companyId: "standard",
      name: "QHSE Duo — Référentiel Standard",
      description: "Modèle de référence national et réglementaire QHSE Duo.",
      code: "STD-001",
      versionMajor: 1,
      versionMinor: 0,
      status: "actif",
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activeVersion: {
        id: "default-v1",
        templateId: "default",
        companyId: "standard",
        versionMajor: 1,
        versionMinor: 0,
        versionLabel: "v1.0",
        status: "actif",
        configuration: DEFAULT_TEMPLATE_SNAPSHOT,
        createdAt: new Date().toISOString(),
      },
    };
  }

  const supabase = (await createClient()) as any;

  const { data: t, error } = await supabase
    .from("work_permit_templates")
    .select(`
      *,
      versions:work_permit_template_versions(*)
    `)
    .eq("id", id)
    .single();

  if (error || !t) {
    return null;
  }

  const versions = Array.isArray(t.versions) ? t.versions : [];
  const activeVersion = versions.find((v: any) => v.status === "actif") || versions[0] || null;

  return {
    id: t.id,
    companyId: t.company_id,
    name: t.name,
    description: t.description || "",
    code: t.code,
    versionMajor: t.version_major,
    versionMinor: t.version_minor,
    status: t.status,
    isDefault: t.is_default,
    createdBy: t.created_by,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    activeVersion: activeVersion
      ? {
          id: activeVersion.id,
          templateId: activeVersion.template_id,
          companyId: activeVersion.company_id,
          versionMajor: activeVersion.version_major,
          versionMinor: activeVersion.version_minor,
          versionLabel: activeVersion.version_label,
          status: activeVersion.status,
          configuration: activeVersion.configuration || DEFAULT_TEMPLATE_SNAPSHOT,
          createdBy: activeVersion.created_by,
          createdAt: activeVersion.created_at,
        }
      : null,
  };
}

export async function createWorkPermitTemplate(payload: {
  name: string;
  description?: string;
  code: string;
  configuration?: WorkPermitTemplateSnapshot;
}): Promise<{ templateId?: string; error?: string }> {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: insertedTemplate, error: tErr } = await supabase
    .from("work_permit_templates")
    .insert({
      name: payload.name,
      description: payload.description || "",
      code: payload.code.toUpperCase(),
      version_major: 1,
      version_minor: 0,
      status: "brouillon",
      is_default: false,
      created_by: user?.id || null,
    })
    .select()
    .single();

  if (tErr || !insertedTemplate) {
    console.error("Error creating permit template:", tErr);
    return { error: tErr?.message || "Impossible de créer le modèle de permis." };
  }

  const initialConfig = payload.configuration || {
    ...DEFAULT_TEMPLATE_SNAPSHOT,
    templateName: payload.name,
    versionLabel: "v1.0",
  };

  const { error: vErr } = await supabase.from("work_permit_template_versions").insert({
    template_id: insertedTemplate.id,
    version_major: 1,
    version_minor: 0,
    version_label: "v1.0",
    status: "actif",
    configuration: initialConfig,
    created_by: user?.id || null,
  });

  if (vErr) {
    console.error("Error creating template version:", vErr);
  }

  revalidatePath("/parametres/permis-de-travail/modeles");
  return { templateId: insertedTemplate.id };
}

export async function updateWorkPermitTemplateDraft(
  id: string,
  payload: {
    name?: string;
    description?: string;
    code?: string;
    configuration?: WorkPermitTemplateSnapshot;
  }
): Promise<ActionResult> {
  const supabase = (await createClient()) as any;

  // Check if template is published and has attached permits
  const { data: template } = await supabase
    .from("work_permit_templates")
    .select("status")
    .eq("id", id)
    .single();

  if (!template) return { error: "Modèle introuvable." };

  const updateFields: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (payload.name) updateFields.name = payload.name;
  if (payload.description !== undefined) updateFields.description = payload.description;
  if (payload.code) updateFields.code = payload.code.toUpperCase();

  const { error: tErr } = await supabase
    .from("work_permit_templates")
    .update(updateFields)
    .eq("id", id);

  if (tErr) return { error: tErr.message };

  if (payload.configuration) {
    // Update active or latest version configuration
    const { data: latestVersion } = await supabase
      .from("work_permit_template_versions")
      .select("id")
      .eq("template_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestVersion) {
      await supabase
        .from("work_permit_template_versions")
        .update({ configuration: payload.configuration })
        .eq("id", latestVersion.id);
    }
  }

  revalidatePath("/parametres/permis-de-travail/modeles");
  revalidatePath(`/parametres/permis-de-travail/modeles/${id}`);
  return { error: null };
}

export async function publishTemplateVersion(
  id: string,
  configuration: WorkPermitTemplateSnapshot
): Promise<ActionResult> {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: template } = await supabase
    .from("work_permit_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (!template) return { error: "Modèle introuvable." };

  // Calculate new version label
  let nextMajor = template.version_major;
  let nextMinor = template.version_minor;

  if (template.status === "actif") {
    nextMinor += 1;
  }

  const versionLabel = `v${nextMajor}.${nextMinor}`;
  const updatedSnapshot: WorkPermitTemplateSnapshot = {
    ...configuration,
    templateName: template.name,
    versionLabel,
  };

  // Archive old versions
  await supabase
    .from("work_permit_template_versions")
    .update({ status: "archive" })
    .eq("template_id", id);

  // Insert new active version
  const { error: vErr } = await supabase.from("work_permit_template_versions").insert({
    template_id: id,
    version_major: nextMajor,
    version_minor: nextMinor,
    version_label: versionLabel,
    status: "actif",
    configuration: updatedSnapshot,
    created_by: user?.id || null,
  });

  if (vErr) return { error: vErr.message };

  // Update template record
  await supabase
    .from("work_permit_templates")
    .update({
      status: "actif",
      version_major: nextMajor,
      version_minor: nextMinor,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/parametres/permis-de-travail/modeles");
  revalidatePath(`/parametres/permis-de-travail/modeles/${id}`);
  return { error: null };
}

export async function archiveWorkPermitTemplate(id: string): Promise<ActionResult> {
  const supabase = (await createClient()) as any;

  const { error } = await supabase
    .from("work_permit_templates")
    .update({
      status: "archive",
      is_default: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/parametres/permis-de-travail/modeles");
  return { error: null };
}

export async function setDefaultTemplate(id: string): Promise<ActionResult> {
  const supabase = (await createClient()) as any;

  // Set all to false first
  await supabase
    .from("work_permit_templates")
    .update({ is_default: false })
    .neq("id", id);

  const { error } = await supabase
    .from("work_permit_templates")
    .update({ is_default: true })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/parametres/permis-de-travail/modeles");
  return { error: null };
}

export async function getActiveTemplateForCompany(templateId?: string | null): Promise<{
  template: WorkPermitTemplate | null;
  versionId: string | null;
  snapshot: WorkPermitTemplateSnapshot;
}> {
  if (templateId === "default") {
    return {
      template: null,
      versionId: null,
      snapshot: DEFAULT_TEMPLATE_SNAPSHOT,
    };
  }

  const supabase = (await createClient()) as any;

  let query = supabase.from("work_permit_templates").select(`
    *,
    active_versions:work_permit_template_versions(*)
  `);

  if (templateId) {
    query = query.eq("id", templateId);
  } else {
    query = query.eq("is_default", true).eq("status", "actif");
  }

  const { data: templates } = await query.limit(1);

  if (!templates || templates.length === 0) {
    // If no default active template found, fallback to default snapshot
    return {
      template: null,
      versionId: null,
      snapshot: DEFAULT_TEMPLATE_SNAPSHOT,
    };
  }

  const t = templates[0];
  const versions = Array.isArray(t.active_versions) ? t.active_versions : [];
  const activeVersion = versions.find((v: any) => v.status === "actif") || versions[0] || null;

  const snapshot: WorkPermitTemplateSnapshot = activeVersion?.configuration || DEFAULT_TEMPLATE_SNAPSHOT;

  return {
    template: {
      id: t.id,
      companyId: t.company_id,
      name: t.name,
      description: t.description || "",
      code: t.code,
      versionMajor: t.version_major,
      versionMinor: t.version_minor,
      status: t.status,
      isDefault: t.is_default,
      createdBy: t.created_by,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    },
    versionId: activeVersion?.id || null,
    snapshot,
  };
}
