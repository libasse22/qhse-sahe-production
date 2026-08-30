"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/services/auth.service";
import type {
  EpiCatalogItem,
  EpiAssignment,
  EpiCategory,
  EpiConditionState,
  EpiAssignmentStatus,
} from "@/lib/types/epi";
import { epiCatalogSchema, epiAssignmentSchema } from "@/lib/validation/epi.schema";

const DEFAULT_CATALOG_ITEMS: Array<{
  name: string;
  category: EpiCategory;
  isoNorm: string;
  lifespanMonths: number;
  periodicInspectionDays: number;
  description: string;
}> = [
  {
    name: "Casque de chantier haute protection",
    category: "casque",
    isoNorm: "EN 397",
    lifespanMonths: 36,
    periodicInspectionDays: 365,
    description: "Protection contre les chocs et la chute d'objets.",
  },
  {
    name: "Chaussures de sécurité anti-perforation S3",
    category: "chaussures",
    isoNorm: "EN ISO 20345",
    lifespanMonths: 24,
    periodicInspectionDays: 180,
    description: "Embout acier, semelle anti-perforation et anti-dérapante.",
  },
  {
    name: "Gants de manutention et anti-coupure 4X42D",
    category: "gants",
    isoNorm: "EN 388",
    lifespanMonths: 6,
    periodicInspectionDays: 90,
    description: "Protection contre les risques mécaniques et coupures.",
  },
  {
    name: "Lunettes de protection enveloppantes UV",
    category: "lunettes",
    isoNorm: "EN 166",
    lifespanMonths: 12,
    periodicInspectionDays: 180,
    description: "Protection oculaire anti-rayures et anti-buée.",
  },
  {
    name: "Gilet haute visibilité Classe 2",
    category: "gilet",
    isoNorm: "EN ISO 20471",
    lifespanMonths: 12,
    periodicInspectionDays: 180,
    description: "Bandes réfléchissantes pour travail de jour comme de nuit.",
  },
  {
    name: "Harnais de sécurité anti-chute 2 points",
    category: "harnais",
    isoNorm: "EN 361",
    lifespanMonths: 60,
    periodicInspectionDays: 365,
    description: "Équipement pour travaux en hauteur avec absorbeur.",
  },
  {
    name: "Casque anti-bruit haute atténuation 30dB",
    category: "ouie",
    isoNorm: "EN 352-1",
    lifespanMonths: 36,
    periodicInspectionDays: 365,
    description: "Protection auditive pour environnements très bruyants.",
  },
  {
    name: "Masque de protection respiratoire FFP2",
    category: "respiratoire",
    isoNorm: "EN 149",
    lifespanMonths: 1,
    periodicInspectionDays: 30,
    description: "Filtration des poussières fines et aérosols.",
  },
];

export async function listEpiCatalog(): Promise<EpiCatalogItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("epi_catalog").select("*").order("name");

  if (error) return [];

  // Si le catalogue est vide, auto-initialiser avec le catalogue standard
  if (!data || data.length === 0) {
    const { data: userRes } = await supabase.auth.getUser();
    if (userRes?.user) {
      await supabase.from("epi_catalog").insert(DEFAULT_CATALOG_ITEMS);
      const { data: newData } = await supabase.from("epi_catalog").select("*").order("name");
      return (newData || []).map((row: any) => ({
        id: row.id,
        companyId: row.company_id,
        name: row.name,
        category: row.category as EpiCategory,
        isoNorm: row.iso_norm || "",
        lifespanMonths: row.lifespan_months || 24,
        periodicInspectionDays: row.periodic_inspection_days || 365,
        description: row.description || "",
        createdAt: row.created_at,
      }));
    }
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    category: row.category as EpiCategory,
    isoNorm: row.iso_norm || "",
    lifespanMonths: row.lifespan_months || 24,
    periodicInspectionDays: row.periodic_inspection_days || 365,
    description: row.description || "",
    createdAt: row.created_at,
  }));
}

export async function createEpiCatalogItem(formData: FormData): Promise<ActionResult> {
  const parsed = epiCatalogSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    isoNorm: formData.get("isoNorm") || "",
    lifespanMonths: formData.get("lifespanMonths"),
    periodicInspectionDays: formData.get("periodicInspectionDays"),
    description: formData.get("description") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("epi_catalog").insert({
    name: parsed.data.name,
    category: parsed.data.category,
    iso_norm: parsed.data.isoNorm,
    lifespan_months: parsed.data.lifespanMonths,
    periodic_inspection_days: parsed.data.periodicInspectionDays,
    description: parsed.data.description,
  });

  if (error) return { error: "Erreur lors de la création du modèle d'EPI." };

  revalidatePath("/epi");
  return { error: null };
}

export async function listEpiAssignments(recipientId?: string): Promise<EpiAssignment[]> {
  const supabase = await createClient();
  let query = supabase
    .from("epi_assignments")
    .select(`
      *,
      catalog:epi_catalog(name, category, iso_norm),
      recipient:profiles!epi_assignments_recipient_id_fkey(full_name),
      assigned_by_profile:profiles!epi_assignments_assigned_by_fkey(full_name)
    `)
    .order("assigned_at", { ascending: false });

  if (recipientId) {
    query = query.eq("recipient_id", recipientId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as any[]).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    catalogId: row.catalog_id,
    catalogName: row.catalog?.name ?? "EPI inconnu",
    category: row.catalog?.category ?? "autre",
    isoNorm: row.catalog?.iso_norm ?? "",
    recipientId: row.recipient_id,
    recipientName: row.recipient?.full_name ?? "Employé inconnu",
    assignedById: row.assigned_by,
    assignedByName: row.assigned_by_profile?.full_name ?? "Responsable",
    serialNumber: row.serial_number || "",
    quantity: row.quantity || 1,
    size: row.size || "",
    conditionState: row.condition_state as EpiConditionState,
    status: row.status as EpiAssignmentStatus,
    assignedAt: row.assigned_at,
    renewalDueAt: row.renewal_due_at,
    returnedAt: row.returned_at,
    renewalReason: row.renewal_reason || "",
    signatureProof: row.signature_proof || "",
    confirmationCode: row.confirmation_code || "",
    confirmedAt: row.confirmed_at || null,
    confirmedByUser: row.confirmed_by_user || false,
    signatureUrl: row.signature_url || "",
    notes: row.notes || "",
    createdAt: row.created_at,
  }));
}

export async function createEpiAssignment(formData: FormData): Promise<ActionResult> {
  const parsed = epiAssignmentSchema.safeParse({
    catalogId: formData.get("catalogId"),
    recipientId: formData.get("recipientId"),
    serialNumber: formData.get("serialNumber") || "",
    quantity: formData.get("quantity") || 1,
    size: formData.get("size") || "",
    conditionState: formData.get("conditionState") || "bon",
    status: formData.get("status") || "attribue",
    assignedAt: formData.get("assignedAt"),
    renewalDueAt: formData.get("renewalDueAt") || "",
    notes: formData.get("notes") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return { error: "Session expirée" };

  const {
    catalogId,
    recipientId,
    serialNumber,
    quantity,
    size,
    conditionState,
    status,
    assignedAt,
    renewalDueAt,
    notes,
  } = parsed.data;

  // Code de confirmation aléatoire à 6 chiffres
  const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();

  const { error } = await supabase.from("epi_assignments").insert({
    catalog_id: catalogId,
    recipient_id: recipientId,
    assigned_by: userRes.user.id,
    serial_number: serialNumber,
    quantity,
    size,
    condition_state: conditionState,
    status,
    assigned_at: assignedAt,
    renewal_due_at: renewalDueAt ? new Date(renewalDueAt).toISOString() : null,
    confirmation_code: confirmationCode,
    notes,
  });

  if (error) return { error: "Impossible d'enregistrer l'attribution d'EPI." };

  revalidatePath("/epi");
  revalidatePath("/admin/utilisateurs");
  return { error: null };
}

export async function updateEpiAssignmentStatus(
  id: string,
  status: EpiAssignmentStatus,
  conditionState?: EpiConditionState,
  renewalReason?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };

  if (conditionState) updates.condition_state = conditionState;
  if (renewalReason) updates.renewal_reason = renewalReason;
  if (status === "restitue") updates.returned_at = new Date().toISOString();

  const { error } = await supabase.from("epi_assignments").update(updates).eq("id", id);
  if (error) return { error: "Erreur lors de la mise à jour de l'EPI." };

  revalidatePath("/epi");
  return { error: null };
}

export async function confirmEpiReceipt(assignmentId: string, providedCode?: string): Promise<ActionResult> {
  const supabase = await createClient();

  if (providedCode) {
    const { data: current } = await supabase
      .from("epi_assignments")
      .select("confirmation_code")
      .eq("id", assignmentId)
      .single();

    if (!current || current.confirmation_code !== providedCode.trim()) {
      return { error: "Code d'émargement / PIN incorrect." };
    }
  }

  const { error } = await supabase
    .from("epi_assignments")
    .update({
      confirmed_at: new Date().toISOString(),
      confirmed_by_user: true,
      status: "en_service",
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId);

  if (error) return { error: "Impossible de confirmer la réception de l'EPI." };

  revalidatePath("/epi");
  revalidatePath("/ouvrier");
  return { error: null };
}

export async function getPublicEpiAssignment(id: string): Promise<Partial<EpiAssignment> | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_epi_assignment", { p_id: id });

  if (error || !data || (data as any[]).length === 0) {
    return null;
  }

  const row = (data as any[])[0];
  return {
    id: row.id,
    catalogName: row.catalog_name,
    category: row.category,
    isoNorm: row.iso_norm,
    recipientName: row.recipient_name,
    assignedAt: row.assigned_at,
    renewalDueAt: row.renewal_due_at,
    conditionState: row.condition_state,
    status: row.status,
    confirmedAt: row.confirmed_at,
    serialNumber: row.serial_number,
  };
}
