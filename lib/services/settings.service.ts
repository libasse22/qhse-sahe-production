"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { appSettingsSchema } from "@/lib/validation/settings.schema";
import type { ActionResult } from "@/lib/services/auth.service";
import type { AppSettings } from "@/lib/types/settings";
import { DEFAULT_APP_NAME } from "@/lib/types/settings";

const BUCKET = "app-branding";

/**
 * Réglages d'identité (nom, logo). Lecture publique (RLS app_settings_select_public) :
 * utilisable depuis les pages non authentifiées (connexion, inscription).
 */
export async function getAppSettings(): Promise<AppSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("app_name, logo_storage_path").eq("id", true).maybeSingle();

  if (!data) {
    return { appName: DEFAULT_APP_NAME, logoStoragePath: null, logoUrl: null };
  }

  let logoUrl: string | null = null;
  if (data.logo_storage_path) {
    const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(data.logo_storage_path);
    logoUrl = publicUrl.publicUrl;
  }

  return { appName: data.app_name, logoStoragePath: data.logo_storage_path, logoUrl };
}

/** Réservé admin (policy RLS app_settings_update_admin). */
export async function updateAppName(formData: FormData): Promise<ActionResult> {
  const parsed = appSettingsSchema.safeParse({ appName: formData.get("appName") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nom invalide" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { error } = await supabase
    .from("app_settings")
    .update({ app_name: parsed.data.appName, updated_by: user.id })
    .eq("id", true);

  if (error) return { error: "Impossible de mettre à jour le nom de l'application." };

  revalidatePath("/", "layout");
  return { error: null };
}

export async function createLogoUploadTarget(
  fileName: string,
): Promise<{ path: string; token: string } | { error: string }> {
  const supabase = await createClient();
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `logo-${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "Impossible de préparer l'envoi du logo." };

  return { path: data.path, token: data.token };
}

export async function confirmLogo(storagePath: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { data: current } = await supabase
    .from("app_settings")
    .select("logo_storage_path")
    .eq("id", true)
    .maybeSingle();

  const { error } = await supabase
    .from("app_settings")
    .update({ logo_storage_path: storagePath, updated_by: user.id })
    .eq("id", true);

  if (error) return { error: "Logo envoyé mais impossible de l'enregistrer." };

  if (current?.logo_storage_path && current.logo_storage_path !== storagePath) {
    await supabase.storage.from(BUCKET).remove([current.logo_storage_path]);
  }

  revalidatePath("/", "layout");
  return { error: null };
}

export async function removeLogo(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("app_settings")
    .select("logo_storage_path")
    .eq("id", true)
    .maybeSingle();

  const { error } = await supabase.from("app_settings").update({ logo_storage_path: null }).eq("id", true);
  if (error) return { error: "Impossible de retirer le logo." };

  if (current?.logo_storage_path) {
    await supabase.storage.from(BUCKET).remove([current.logo_storage_path]);
  }

  revalidatePath("/", "layout");
  return { error: null };
}
