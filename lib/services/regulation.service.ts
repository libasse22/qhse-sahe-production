"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/services/auth.service";
import type { InternalRegulation } from "@/lib/types/regulation";

const REG_SELECT = "*, author:profiles!internal_regulations_created_by_fkey(full_name)";
const BUCKET = "qhse-documents";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

interface RegulationRow {
  id: string;
  title: string;
  content: string | null;
  version: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  pdf_storage_path: string | null;
  author: { full_name: string } | null;
}

async function toRegulation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: RegulationRow,
): Promise<InternalRegulation> {
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
    createdByName: row.author?.full_name || "-",
    createdAt: row.created_at,
    pdfStoragePath: row.pdf_storage_path,
    pdfUrl,
  };
}

export async function getActiveRegulation(): Promise<InternalRegulation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("internal_regulations")
    .select(REG_SELECT)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return toRegulation(supabase, data as unknown as RegulationRow);
}

export async function listRegulations(): Promise<InternalRegulation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("internal_regulations")
    .select(REG_SELECT)
    .order("version", { ascending: false });

  if (error || !data) return [];
  return Promise.all((data as unknown as RegulationRow[]).map((row) => toRegulation(supabase, row)));
}

export interface CreateRegulationResult {
  error: string | null;
  id?: string;
}

export async function createRegulation(formData: FormData): Promise<CreateRegulationResult> {
  const title = formData.get("title");
  const content = formData.get("content");

  if (typeof title !== "string" || !title.trim()) {
    return { error: "Le titre est obligatoire." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expiree, reconnecte-toi." };

  const { data: last } = await supabase
    .from("internal_regulations")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = ((last as any)?.version ?? 0) + 1;

  await supabase
    .from("internal_regulations")
    .update({ is_active: false } as any)
    .eq("is_active", true);

  const { data, error } = await supabase
    .from("internal_regulations")
    .insert({
      title: title.trim(),
      content: typeof content === "string" ? content : null,
      version: nextVersion,
      is_active: true,
      created_by: user.id,
    } as any)
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Impossible de publier le reglement interieur." };
  }

  const { data: activeUsers } = await supabase
    .from("profiles")
    .select("id")
    .eq("status", "active")
    .neq("id", user.id);

  if (activeUsers && activeUsers.length > 0) {
    await supabase.from("notifications").insert(
      (activeUsers as any[]).map((u) => ({
        user_id: u.id,
        title: "Nouveau reglement interieur",
        message: title.trim(),
        link: "/reglement-interieur",
      })),
    );

    // Expédition Web Push arrière-plan non-bloquante
    const { sendWebPushToUser } = await import("@/lib/services/web-push.service");
    for (const u of activeUsers as any[]) {
      void sendWebPushToUser(u.id, {
        title: "📄 Nouveau règlement intérieur publié",
        body: `Titre : ${title.trim()} (v${nextVersion})`,
        url: "/reglement-interieur",
        tag: `reg-${(data as any).id}`,
      });
    }
  }

  revalidatePath("/reglement-interieur");
  revalidatePath("/ouvrier/reglement-interieur");
  return { error: null, id: (data as any).id };
}

export async function createRegulationPdfUploadTarget(
  fileName: string,
): Promise<{ path: string; token: string } | { error: string }> {
  const supabase = await createClient();
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `reglement-interieur/${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "Impossible de preparer l'envoi du PDF." };

  return { path: data.path, token: data.token };
}

export async function attachRegulationPdf(regulationId: string, storagePath: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("internal_regulations")
    .update({ pdf_storage_path: storagePath } as any)
    .eq("id", regulationId);

  if (error) {
    return { error: "Reglement publie, mais impossible de joindre le PDF." };
  }

  revalidatePath("/reglement-interieur");
  revalidatePath("/ouvrier/reglement-interieur");
  return { error: null };
}

