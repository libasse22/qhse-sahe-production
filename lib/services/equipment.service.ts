"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { equipmentSchema } from "@/lib/validation/equipment.schema";
import type { ActionResult } from "@/lib/services/auth.service";
import type { Equipment, EquipmentStatus } from "@/lib/types/equipment";

const EQUIPMENT_SELECT = "*, site:sites(name)";

interface EquipmentRow {
  id: string;
  name: string;
  category: string;
  serial_number: string;
  site_id: string | null;
  status: EquipmentStatus;
  created_at: string;
  site: { name: string } | null;
}

function toEquipment(row: EquipmentRow): Equipment {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    serialNumber: row.serial_number,
    siteId: row.site_id,
    siteName: row.site?.name ?? null,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listEquipment(): Promise<Equipment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("equipment").select(EQUIPMENT_SELECT).order("name");
  if (error || !data) return [];
  return (data as unknown as EquipmentRow[]).map(toEquipment);
}

export async function getEquipmentById(id: string): Promise<Equipment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("equipment").select(EQUIPMENT_SELECT).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return toEquipment(data as unknown as EquipmentRow);
}

/** Réservé à la permission equipment.manage (policy RLS equipment_write_permission). */
export async function createEquipment(formData: FormData): Promise<ActionResult> {
  const parsed = equipmentSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") || "",
    serialNumber: formData.get("serialNumber") || "",
    siteId: formData.get("siteId") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { name, category, serialNumber, siteId } = parsed.data;

  const { error } = await supabase.from("equipment").insert({
    name,
    category,
    serial_number: serialNumber,
    site_id: siteId || null,
    created_by: user.id,
  });

  if (error) return { error: "Impossible de créer cet équipement." };

  revalidatePath("/equipements");
  return { error: null };
}

export async function updateEquipmentStatus(id: string, status: EquipmentStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("equipment").update({ status }).eq("id", id);
  if (error) return { error: "Impossible de mettre à jour le statut." };

  revalidatePath("/equipements");
  revalidatePath(`/equipements/${id}`);
  return { error: null };
}

export async function deleteEquipment(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("equipment").delete().eq("id", id);
  if (error) return { error: "Impossible de supprimer cet équipement." };

  revalidatePath("/equipements");
  return { error: null };
}
