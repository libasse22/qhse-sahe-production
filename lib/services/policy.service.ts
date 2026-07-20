"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { policySchema } from "@/lib/validation/policy.schema";
import type { ActionResult } from "@/lib/services/auth.service";
import type { QhsePolicy, PolicyAcknowledgementStats } from "@/lib/types/policy";

const POLICY_SELECT = "*, author:profiles!qhse_policies_created_by_fkey(full_name)";

const BUCKET = "qhse-documents";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

interface PolicyRow {
  id: string;
  title: string;
  content: string;
  version: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  pdf_storage_path: string | null;
  author: { full_name: string } | null;
}

async function toPolicy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: PolicyRow,
): Promise<QhsePolicy> {
  let pdfUrl: string | null = null;
  if (row.pdf_storage_path) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.pdf_storage_path, SIGNED_URL_TTL_SECONDS);
    pdfUrl = signed?.signedUrl ?? null;
  }

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    version: row.version,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdByName: row.author?.full_name || "—",
    createdAt: row.created_at,
    pdfStoragePath: row.pdf_storage_path,
    pdfUrl,
  };
}

/** Version actuellement diffusée (une seule à la fois), ou null si aucune. */
export async function getActivePolicy(): Promise<QhsePolicy | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("qhse_policies")
    .select(POLICY_SELECT)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return toPolicy(supabase, data as unknown as PolicyRow);
}

export async function listPolicies(): Promise<QhsePolicy[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("qhse_policies")
    .select(POLICY_SELECT)
    .order("version", { ascending: false });

  if (error || !data) return [];
  return Promise.all((data as unknown as PolicyRow[]).map((row) => toPolicy(supabase, row)));
}

/** L'utilisateur courant a-t-il déjà accusé réception de cette version ? */
export async function hasAcknowledged(policyId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("policy_acknowledgements")
    .select("id")
    .eq("policy_id", policyId)
    .eq("user_id", user.id)
    .maybeSingle();

  return !!data;
}

export async function acknowledgePolicy(policyId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { error } = await supabase
    .from("policy_acknowledgements")
    .insert({ policy_id: policyId, user_id: user.id });

  // Contrainte unique : déjà accusé réception, on considère que c'est un succès idempotent.
  if (error && error.code !== "23505") {
    return { error: "Impossible d'enregistrer ta confirmation de lecture." };
  }

  revalidatePath("/politique");
  revalidatePath("/ouvrier/politique");
  return { error: null };
}

export interface CreatePolicyResult {
  error: string | null;
  id?: string;
}

/**
 * Publie une nouvelle version active de la politique QHSE. Réservé aux
 * managers QHSE / admin par la policy RLS qhse_policies_insert_qhse.
 */
export async function createPolicy(formData: FormData): Promise<CreatePolicyResult> {
  const parsed = policySchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { data: last } = await supabase
    .from("qhse_policies")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (last?.version ?? 0) + 1;
  const { title, content } = parsed.data;

  const { data, error } = await supabase
    .from("qhse_policies")
    .insert({
      title,
      content,
      version: nextVersion,
      is_active: true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Impossible de publier la politique." };
  }

  revalidatePath("/politique");
  revalidatePath("/ouvrier/politique");
  return { error: null, id: data.id };
}

/** Prépare une URL de dépôt signée pour joindre un PDF à une politique (bucket partagé avec le module Documents). */
export async function createPolicyPdfUploadTarget(
  fileName: string,
): Promise<{ path: string; token: string } | { error: string }> {
  const supabase = await createClient();
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `politiques/${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "Impossible de préparer l'envoi du PDF." };

  return { path: data.path, token: data.token };
}

/** Relie le PDF envoyé à la version de politique nouvellement créée. */
export async function attachPolicyPdf(policyId: string, storagePath: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("qhse_policies")
    .update({ pdf_storage_path: storagePath })
    .eq("id", policyId);

  if (error) {
    return { error: "Politique publiée, mais impossible de joindre le PDF." };
  }

  revalidatePath("/politique");
  revalidatePath("/ouvrier/politique");
  return { error: null };
}

/** Taux de lecture de la version active, réservé manager QHSE / admin (RLS). */
export async function getAcknowledgementStats(policyId: string): Promise<PolicyAcknowledgementStats> {
  const supabase = await createClient();

  const [{ data: activeUsers }, { data: acks }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("status", "active"),
    supabase.from("policy_acknowledgements").select("user_id").eq("policy_id", policyId),
  ]);

  const ackIds = new Set((acks ?? []).map((a) => a.user_id));
  const users = activeUsers ?? [];

  return {
    totalActiveUsers: users.length,
    acknowledgedCount: users.filter((u) => ackIds.has(u.id)).length,
    pendingUsers: users
      .filter((u) => !ackIds.has(u.id))
      .map((u) => ({ id: u.id, fullName: u.full_name, email: u.email })),
  };
}
