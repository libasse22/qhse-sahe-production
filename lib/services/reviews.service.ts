"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { managementReviewSchema } from "@/lib/validation/review.schema";
import type { ActionResult } from "@/lib/services/auth.service";
import type { ManagementReview } from "@/lib/types/review";

const REVIEW_SELECT = "*, author:profiles!management_reviews_created_by_fkey(full_name)";

export async function listManagementReviews(): Promise<ManagementReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("management_reviews")
    .select(REVIEW_SELECT)
    .order("review_date", { ascending: false });
  if (error || !data) return [];
  return (
    data as unknown as {
      id: string;
      title: string;
      review_date: string;
      summary: string;
      decisions: string;
      created_at: string;
      author: { full_name: string } | null;
    }[]
  ).map((row) => ({
    id: row.id,
    title: row.title,
    reviewDate: row.review_date,
    summary: row.summary,
    decisions: row.decisions,
    createdByName: row.author?.full_name || "—",
    createdAt: row.created_at,
  }));
}

export async function createManagementReview(formData: FormData): Promise<ActionResult> {
  const parsed = managementReviewSchema.safeParse({
    title: formData.get("title"),
    reviewDate: formData.get("reviewDate"),
    summary: formData.get("summary"),
    decisions: formData.get("decisions"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { title, reviewDate, summary, decisions } = parsed.data;
  const { error } = await supabase.from("management_reviews").insert({
    title,
    review_date: reviewDate,
    summary,
    decisions,
    created_by: user.id,
  });

  if (error) return { error: "Impossible d'enregistrer la revue de direction." };

  revalidatePath("/revues-de-direction");
  return { error: null };
}
