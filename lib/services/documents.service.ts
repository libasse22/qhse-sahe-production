"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { documentMetaSchema } from "@/lib/validation/document.schema";
import type { ActionResult } from "@/lib/services/auth.service";
import type { QhseDocument } from "@/lib/types/document";

const BUCKET = "qhse-documents";
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const DOCUMENT_SELECT = "*, author:profiles!documents_uploaded_by_fkey(full_name)";

export async function listDocuments(): Promise<QhseDocument[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_SELECT)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return Promise.all(
    (
      data as unknown as {
        id: string;
        title: string;
        category: string;
        storage_path: string;
        version: number;
        created_at: string;
        author: { full_name: string } | null;
      }[]
    ).map(async (row) => {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
      return {
        id: row.id,
        title: row.title,
        category: row.category,
        storagePath: row.storage_path,
        version: row.version,
        uploadedByName: row.author?.full_name || "—",
        createdAt: row.created_at,
        url: signed?.signedUrl ?? null,
      };
    }),
  );
}

/** Prépare une URL de dépôt signée pour l'upload direct depuis le navigateur. */
export async function createDocumentUploadTarget(
  fileName: string,
): Promise<{ path: string; token: string } | { error: string }> {
  const supabase = await createClient();
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "Impossible de préparer l'envoi du document." };

  return { path: data.path, token: data.token };
}

export async function confirmDocument(
  storagePath: string,
  title: string,
  category: string,
): Promise<ActionResult> {
  const parsed = documentMetaSchema.safeParse({ title, category });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Titre invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { error } = await supabase.from("documents").insert({
    title: parsed.data.title,
    category: parsed.data.category || "Général",
    storage_path: storagePath,
    uploaded_by: user.id,
  });

  if (error) return { error: "Document envoyé mais impossible de l'enregistrer." };

  revalidatePath("/documents");
  return { error: null };
}

export async function deleteDocument(id: string, storagePath: string): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([storagePath]);
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return { error: "Impossible de supprimer ce document." };
  revalidatePath("/documents");
  return { error: null };
}
