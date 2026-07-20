"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { interestedPartySchema, complianceObligationSchema } from "@/lib/validation/compliance.schema";
import type { ActionResult } from "@/lib/services/auth.service";
import type { InterestedParty, ComplianceObligation, ComplianceStatus } from "@/lib/types/compliance";

export async function listInterestedParties(): Promise<InterestedParty[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interested_parties")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    expectations: row.expectations,
    createdAt: row.created_at,
  }));
}

export async function createInterestedParty(formData: FormData): Promise<ActionResult> {
  const parsed = interestedPartySchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    expectations: formData.get("expectations"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { error } = await supabase.from("interested_parties").insert({ ...parsed.data, created_by: user.id });
  if (error) return { error: "Impossible d'ajouter cette partie intéressée." };

  revalidatePath("/parties-interessees");
  return { error: null };
}

export async function deleteInterestedParty(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("interested_parties").delete().eq("id", id);
  if (error) return { error: "Impossible de supprimer." };
  revalidatePath("/parties-interessees");
  return { error: null };
}

export async function listComplianceObligations(): Promise<ComplianceObligation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("compliance_obligations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    description: row.description,
    source: row.source,
    status: row.status,
    reviewDate: row.review_date,
    createdAt: row.created_at,
  }));
}

export async function createComplianceObligation(formData: FormData): Promise<ActionResult> {
  const parsed = complianceObligationSchema.safeParse({
    description: formData.get("description"),
    source: formData.get("source"),
    reviewDate: formData.get("reviewDate") || "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { description, source, reviewDate } = parsed.data;
  const { error } = await supabase.from("compliance_obligations").insert({
    description,
    source,
    review_date: reviewDate || null,
    created_by: user.id,
  });

  if (error) return { error: "Impossible d'ajouter cette obligation." };

  revalidatePath("/parties-interessees");
  return { error: null };
}

export async function updateComplianceStatus(id: string, status: ComplianceStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("compliance_obligations").update({ status }).eq("id", id);
  if (error) return { error: "Impossible de mettre à jour le statut." };
  revalidatePath("/parties-interessees");
  return { error: null };
}
