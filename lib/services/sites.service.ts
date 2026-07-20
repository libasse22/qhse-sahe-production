"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/services/auth.service";

export interface Site {
  id: string;
  name: string;
  address: string;
}

/**
 * Chaque déploiement de l'application n'a qu'une seule entreprise en
 * pratique (cf. module Paramètres) ; on s'appuie ici sur la première ligne
 * de `companies` comme entreprise courante, en la créant si besoin.
 */
async function getOrCreateDefaultCompanyId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (existing) return existing.id;

  const { data: created } = await supabase.from("companies").insert({ name: "Entreprise" }).select("id").single();
  return created?.id ?? null;
}

export async function listSites(): Promise<Site[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sites").select("id, name, address").order("name");
  if (error || !data) return [];
  return data;
}

/** Réservé à la permission equipment.manage (mêmes droits que la gestion des équipements). */
export async function createSite(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") || "").trim();
  const address = String(formData.get("address") || "").trim();

  if (name.length < 2) {
    return { error: "Le nom du site doit contenir au moins 2 caractères." };
  }

  const companyId = await getOrCreateDefaultCompanyId();
  if (!companyId) return { error: "Impossible de déterminer l'entreprise." };

  const supabase = await createClient();
  const { error } = await supabase.from("sites").insert({ company_id: companyId, name, address });

  if (error) return { error: "Impossible de créer ce site." };

  revalidatePath("/equipements");
  return { error: null };
}
