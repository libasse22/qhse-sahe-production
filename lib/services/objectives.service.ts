"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { objectiveSchema, objectiveProgressSchema } from "@/lib/validation/objective.schema";
import type { ActionResult } from "@/lib/services/auth.service";
import type { QhseObjective, ObjectiveStatus } from "@/lib/types/objective";

const OBJECTIVE_SELECT = "*, owner:profiles!qhse_objectives_owner_id_fkey(full_name)";

interface ObjectiveRow {
  id: string;
  title: string;
  description: string;
  unit: string;
  target_value: number;
  current_value: number;
  deadline: string;
  status: ObjectiveStatus;
  owner_id: string | null;
  created_at: string;
  owner: { full_name: string } | null;
}

function toObjective(row: ObjectiveRow): QhseObjective {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    unit: row.unit,
    targetValue: row.target_value,
    currentValue: row.current_value,
    deadline: row.deadline,
    status: row.status,
    ownerId: row.owner_id,
    ownerName: row.owner?.full_name ?? null,
    createdAt: row.created_at,
  };
}

export async function listObjectives(): Promise<QhseObjective[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("qhse_objectives")
    .select(OBJECTIVE_SELECT)
    .order("deadline", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as ObjectiveRow[]).map(toObjective);
}

export async function createObjective(formData: FormData): Promise<ActionResult> {
  const parsed = objectiveSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    unit: formData.get("unit"),
    targetValue: formData.get("targetValue"),
    deadline: formData.get("deadline"),
    ownerId: formData.get("ownerId") || "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { title, description, unit, targetValue, deadline, ownerId } = parsed.data;
  const { error } = await supabase.from("qhse_objectives").insert({
    title,
    description,
    unit,
    target_value: targetValue,
    deadline,
    owner_id: ownerId || null,
    created_by: user.id,
  });

  if (error) return { error: "Impossible de créer l'objectif." };

  revalidatePath("/objectifs");
  return { error: null };
}

export async function updateObjectiveProgress(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = objectiveProgressSchema.safeParse({ currentValue: formData.get("currentValue") });
  if (!parsed.success) return { error: "Valeur invalide." };

  const supabase = await createClient();
  const { data: objective } = await supabase
    .from("qhse_objectives")
    .select("target_value")
    .eq("id", id)
    .single();

  const status: ObjectiveStatus =
    objective && parsed.data.currentValue >= objective.target_value ? "atteint" : "en_cours";

  const { error } = await supabase
    .from("qhse_objectives")
    .update({ current_value: parsed.data.currentValue, status })
    .eq("id", id);

  if (error) return { error: "Impossible de mettre à jour l'avancement." };

  revalidatePath("/objectifs");
  return { error: null };
}
