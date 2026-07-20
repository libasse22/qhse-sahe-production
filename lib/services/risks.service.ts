"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { riskSchema } from "@/lib/validation/risk.schema";
import type { ActionResult } from "@/lib/services/auth.service";
import type { Risk, RiskCategory, RiskStatus } from "@/lib/types/risk";

const RISK_SELECT = "*, owner:profiles!risks_owner_id_fkey(full_name)";

interface RiskRow {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  probability: number;
  gravity: number;
  treatment: string;
  owner_id: string | null;
  status: RiskStatus;
  created_at: string;
  owner: { full_name: string } | null;
}

function toRisk(row: RiskRow): Risk {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    probability: row.probability,
    gravity: row.gravity,
    criticality: row.probability * row.gravity,
    treatment: row.treatment,
    ownerId: row.owner_id,
    ownerName: row.owner?.full_name ?? null,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listRisks(): Promise<Risk[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("risks").select(RISK_SELECT).order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as RiskRow[]).map(toRisk).sort((a, b) => b.criticality - a.criticality);
}

export async function createRisk(formData: FormData): Promise<ActionResult> {
  const parsed = riskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    probability: formData.get("probability"),
    gravity: formData.get("gravity"),
    treatment: formData.get("treatment"),
    ownerId: formData.get("ownerId") || "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { title, description, category, probability, gravity, treatment, ownerId } = parsed.data;
  const { error } = await supabase.from("risks").insert({
    title,
    description,
    category: category as RiskCategory,
    probability,
    gravity,
    treatment,
    owner_id: ownerId || null,
    created_by: user.id,
  });

  if (error) return { error: "Impossible de créer le risque." };

  revalidatePath("/risques");
  return { error: null };
}

export async function updateRiskStatus(id: string, status: RiskStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("risks").update({ status }).eq("id", id);
  if (error) return { error: "Impossible de mettre à jour ce risque." };
  revalidatePath("/risques");
  return { error: null };
}

export async function deleteRisk(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("risks").delete().eq("id", id);
  if (error) return { error: "Impossible de supprimer ce risque." };
  revalidatePath("/risques");
  return { error: null };
}
