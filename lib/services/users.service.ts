"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types/auth";
import type { ActionResult } from "@/lib/services/auth.service";

function toProfile(row: {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: "pending" | "active" | "suspended";
  role_id: string | null;
  created_at: string;
  updated_at: string;
}): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    status: row.status,
    roleId: row.role_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Liste les comptes en attente de validation.
 * Protégé par RLS : ne renvoie des résultats que si l'appelant est admin actif.
 */
export async function listPendingUsers(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map(toProfile);
}

/**
 * Approuve un compte en attente en lui attribuant un rôle et le statut actif.
 * L'update échouera silencieusement (0 ligne affectée) si l'appelant n'est
 * pas admin, grâce aux policies RLS définies en base.
 */
export async function approveUser(
  userId: string,
  role: UserRole,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: systemRole } = await supabase
    .from("roles")
    .select("id")
    .eq("is_system", true)
    .eq("base_bucket", role)
    .maybeSingle();

  const { error } = await supabase
    .from("profiles")
    .update({ role, status: "active", role_id: systemRole?.id ?? null })
    .eq("id", userId);

  if (error) {
    return { error: "Impossible de valider ce compte." };
  }

  revalidatePath("/admin/utilisateurs-en-attente");
  return { error: null };
}

/**
 * Rejette un compte en attente (passe au statut suspendu, ne peut plus se
 * connecter). La suppression définitive reste possible depuis le dashboard
 * Supabase si nécessaire.
 */
export async function rejectUser(userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ status: "suspended" })
    .eq("id", userId);

  if (error) {
    return { error: "Impossible de rejeter ce compte." };
  }

  revalidatePath("/admin/utilisateurs-en-attente");
  return { error: null };
}

/**
 * Liste tous les comptes (tous statuts confondus), triés du plus récent au
 * plus ancien. Réservé aux admins par la policy RLS profiles_select_admin.
 */
export async function listAllUsers(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(toProfile);
}

/** Liste les comptes actifs, utilisée pour les sélecteurs (assignation, responsable d'action). */
export async function listActiveUsers(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "active")
    .order("full_name", { ascending: true });

  if (error || !data) return [];
  return data.map(toProfile);
}

export async function updateUserRole(userId: string, role: UserRole): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);

  if (error) {
    return { error: "Impossible de modifier le rôle." };
  }

  revalidatePath("/admin/utilisateurs");
  return { error: null };
}

/**
 * Assigne un rôle du catalogue configurable à un utilisateur. Met à jour en
 * même temps l'enum historique `role` (déduit du `base_bucket` du rôle
 * choisi) pour que tout le routage et les policies RLS existantes restent
 * cohérents automatiquement, sans aucune régression.
 */
export async function assignUserRole(userId: string, roleId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("base_bucket")
    .eq("id", roleId)
    .single();

  if (roleError || !role) {
    return { error: "Rôle introuvable." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role_id: roleId, role: role.base_bucket })
    .eq("id", userId);

  if (error) {
    return { error: "Impossible d'assigner ce rôle." };
  }

  revalidatePath("/admin/utilisateurs");
  return { error: null };
}

export async function setUserStatus(
  userId: string,
  status: "active" | "suspended",
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);

  if (error) {
    return { error: "Impossible de modifier le statut de ce compte." };
  }

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/utilisateurs-en-attente");
  return { error: null };
}
