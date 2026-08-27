"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/services/auth.service";

export interface ChecklistItem {
  id: string;
  label: string;
  category?: string;
  required?: boolean;
}

export interface InspectionTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  items: ChecklistItem[];
  createdAt: string;
}

export interface InspectionAnswer {
  status: "conforme" | "non_conforme" | "na";
  comment?: string;
  photoPath?: string;
}

export interface InspectionRun {
  id: string;
  templateId: string | null;
  templateTitle?: string;
  siteId: string | null;
  inspectorId: string;
  inspectorName: string | null;
  title: string;
  status: string;
  answers: Record<string, InspectionAnswer>;
  completedAt: string;
}

const DEFAULT_TEMPLATES_LIST: Omit<InspectionTemplate, "id" | "createdAt">[] = [
  {
    title: "Inspection Chantier & Sécurité",
    category: "Chantier",
    description: "Contrôle général du port des EPI, des balisages et de la propreté du site.",
    items: [
      { id: "epi_helmets", label: "Port du casque et des chaussures de sécurité conforme", required: true },
      { id: "signage", label: "Balisage et signalisation du chantier en place", required: true },
      { id: "fire_extinguisher", label: "Extincteurs accessibles et contrôlés", required: true },
      { id: "scaffolding", label: "Échafaudages vérifiés et sécurisés", required: false },
      { id: "waste_management", label: "Tri et évacuation des déchets de chantier", required: false },
    ],
  },
  {
    title: "Inspection Engins & Véhicules",
    category: "Engins",
    description: "Vérification des organes de sécurité des engins de levage et véhicules.",
    items: [
      { id: "brakes", label: "État et fonctionnement des freins", required: true },
      { id: "lights", label: "Gyrophares et feux de signalisation fonctionnels", required: true },
      { id: "tires", label: "Pression et état des pneumatiques / chenilles", required: true },
      { id: "horn", label: "Avertisseur sonore et alarme de recul", required: true },
      { id: "leaks", label: "Absence de fuite hydraulique ou de carburant", required: false },
    ],
  },
  {
    title: "Inspection Environnement & 5S",
    category: "Environnement",
    description: "Contrôle de la propreté des ateliers et de la rétention des produits chimiques.",
    items: [
      { id: "retention", label: "Bac de rétention sous les fûts de produits chimiques", required: true },
      { id: "spill_kit", label: "Kit anti-pollution complet et accessible", required: true },
      { id: "workshop_clean", label: "Allées de circulation dégagées (Rangement 5S)", required: false },
      { id: "labeling", label: "Étiquetage clair des produits dangereux", required: true },
    ],
  },
];

export async function getDefaultInspectionTemplates(): Promise<Omit<InspectionTemplate, "id" | "createdAt">[]> {
  return DEFAULT_TEMPLATES_LIST;
}

export async function listInspectionTemplates(): Promise<InspectionTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspection_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return DEFAULT_TEMPLATES_LIST.map((tpl, i) => ({
      ...tpl,
      id: `default-${i}`,
      createdAt: new Date().toISOString(),
    }));
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description ?? "",
    items: (row.items as unknown as ChecklistItem[]) ?? [],
    createdAt: row.created_at,
  }));
}

export async function getInspectionTemplateById(id: string): Promise<InspectionTemplate | null> {
  if (id.startsWith("default-")) {
    const index = parseInt(id.replace("default-", ""), 10);
    const tpl = DEFAULT_TEMPLATES_LIST[index];
    if (!tpl) return null;
    return { ...tpl, id, createdAt: new Date().toISOString() };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspection_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    category: data.category,
    description: data.description ?? "",
    items: (data.items as unknown as ChecklistItem[]) ?? [],
    createdAt: data.created_at,
  };
}

export async function createInspectionTemplate(params: {
  title: string;
  category: string;
  description: string;
  items: ChecklistItem[];
}): Promise<ActionResult & { templateId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { data, error } = await supabase
    .from("inspection_templates")
    .insert({
      title: params.title,
      category: params.category,
      description: params.description,
      items: params.items,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Impossible de créer le modèle de checklist." };
  }

  revalidatePath("/inspections");
  return { error: null, templateId: data.id };
}

export async function updateInspectionTemplate(
  id: string,
  params: {
    title: string;
    category: string;
    description: string;
    items: ChecklistItem[];
  },
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("inspection_templates")
    .update({
      title: params.title,
      category: params.category,
      description: params.description,
      items: params.items,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: "Impossible de modifier ce modèle de checklist." };
  }

  revalidatePath("/inspections");
  return { error: null };
}

export async function deleteInspectionTemplate(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("inspection_templates")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: "Impossible de supprimer ce modèle de checklist." };
  }

  revalidatePath("/inspections");
  return { error: null };
}

export async function listInspectionRuns(): Promise<InspectionRun[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspection_runs")
    .select("*, inspector:profiles!inspection_runs_inspector_id_fkey(full_name)")
    .order("completed_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    templateId: row.template_id,
    siteId: row.site_id,
    inspectorId: row.inspector_id,
    inspectorName: row.inspector ? (row.inspector as unknown as { full_name: string }).full_name : null,
    title: row.title,
    status: row.status,
    answers: (row.answers as unknown as Record<string, InspectionAnswer>) ?? {},
    completedAt: row.completed_at,
  }));
}

export async function getInspectionRunById(id: string): Promise<InspectionRun | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspection_runs")
    .select("*, inspector:profiles!inspection_runs_inspector_id_fkey(full_name)")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    templateId: data.template_id,
    siteId: data.site_id,
    inspectorId: data.inspector_id,
    inspectorName: data.inspector ? (data.inspector as unknown as { full_name: string }).full_name : null,
    title: data.title,
    status: data.status,
    answers: (data.answers as unknown as Record<string, InspectionAnswer>) ?? {},
    completedAt: data.completed_at,
  };
}

export async function createInspectionRun(params: {
  templateId?: string;
  title: string;
  answers: Record<string, InspectionAnswer>;
  createActionsForNonConformities?: boolean;
}): Promise<ActionResult & { runId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const realTemplateId = params.templateId && !params.templateId.startsWith("default-") ? params.templateId : null;

  const { data, error } = await supabase
    .from("inspection_runs")
    .insert({
      template_id: realTemplateId,
      inspector_id: user.id,
      title: params.title,
      answers: params.answers,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Impossible d'enregistrer le rapport d'inspection." };
  }

  // --- GÉNÉRATION AUTOMATIQUE DES ACTIONS CORRECTIVES SI SEUIL NON CONFORME ---
  if (params.createActionsForNonConformities !== false) {
    const nonConformities = Object.entries(params.answers).filter(
      ([, ans]) => ans.status === "non_conforme",
    );

    if (nonConformities.length > 0) {
      const { data: inc } = await supabase
        .from("incidents")
        .insert({
          title: `Non-conformité : ${params.title}`,
          description: `Détectée lors de l'inspection. ${nonConformities.length} point(s) non conforme(s).`,
          category: "non_conformite",
          severity: "moyenne",
          location: "Terrain d'inspection",
          reported_by: user.id,
        })
        .select("id")
        .single();

      if (inc) {
        const in7Days = new Date();
        in7Days.setDate(in7Days.getDate() + 7);

        for (const [itemId, ans] of nonConformities) {
          await supabase.from("actions_correctives").insert({
            incident_id: inc.id,
            description: `Corriger l'écart [${itemId}] : ${ans.comment || "Remise en conformité requise."}`,
            responsable_id: user.id,
            echeance: in7Days.toISOString().split("T")[0],
            inspection_run_id: data.id,
            inspection_item_id: itemId,
          });
        }
      }
    }
  }

  revalidatePath("/inspections");
  revalidatePath("/dashboard");
  revalidatePath("/actions");
  return { error: null, runId: data.id };
}
