"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { roleSchema } from "@/lib/validation/role.schema";
import type { ActionResult } from "@/lib/services/auth.service";
import type { Permission, Role } from "@/lib/types/role";
import type { UserRole } from "@/lib/types/database.types";

export async function listPermissions(): Promise<Permission[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("permissions").select("*").order("category");
  if (error || !data) return [];
  return data.map((p) => ({ id: p.id, code: p.code, label: p.label, category: p.category }));
}

/**
 * Permissions du rôle courant, sous forme d'ensemble de codes — pratique
 * pour les gardes d'affichage côté page (`permissions.has("audits.manage")`).
 * Ne remplace jamais la vérification réelle faite par les policies RLS
 * (has_permission() côté base) ; sert uniquement à afficher/masquer les
 * actions dans l'interface.
 */
export async function getCurrentPermissions(): Promise<Set<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data: profile } = await supabase.from("profiles").select("role_id").eq("id", user.id).maybeSingle();
  if (!profile?.role_id) return new Set();

  const { data } = await supabase
    .from("role_permissions")
    .select("permissions(code)")
    .eq("role_id", profile.role_id);

  if (!data) return new Set();
  const codes = (data as unknown as { permissions: { code: string } | null }[])
    .map((row) => row.permissions?.code)
    .filter((c): c is string => !!c);
  return new Set(codes);
}

export async function listRoles(): Promise<Role[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("*, role_permissions(permission_id, permissions(code))")
    .order("is_system", { ascending: false })
    .order("name");

  if (error || !data) return [];

  return (
    data as unknown as {
      id: string;
      name: string;
      description: string;
      base_bucket: UserRole;
      is_system: boolean;
      role_permissions: { permissions: { code: string } | null }[];
    }[]
  ).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    baseBucket: r.base_bucket,
    isSystem: r.is_system,
    permissionCodes: r.role_permissions.map((rp) => rp.permissions?.code).filter((c): c is string => !!c),
  }));
}

/** Réservé admin (policy RLS roles_insert_admin). */
export async function createRole(formData: FormData): Promise<ActionResult> {
  const parsed = roleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || "",
    baseBucket: formData.get("baseBucket"),
    permissionCodes: formData.getAll("permissionCodes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const supabase = await createClient();
  const { name, description, baseBucket, permissionCodes } = parsed.data;

  const { data: role, error } = await supabase
    .from("roles")
    .insert({ name, description, base_bucket: baseBucket, is_system: false })
    .select("id")
    .single();

  if (error || !role) {
    return { error: "Impossible de créer ce rôle (nom peut-être déjà utilisé)." };
  }

  if (permissionCodes.length > 0) {
    const { data: perms } = await supabase.from("permissions").select("id, code").in("code", permissionCodes);
    if (perms && perms.length > 0) {
      await supabase.from("role_permissions").insert(perms.map((p) => ({ role_id: role.id, permission_id: p.id })));
    }
  }

  revalidatePath("/admin/roles");
  return { error: null };
}

/** Remplace entièrement l'ensemble de permissions d'un rôle personnalisé. */
export async function updateRolePermissions(roleId: string, permissionCodes: string[]): Promise<ActionResult> {
  const supabase = await createClient();

  await supabase.from("role_permissions").delete().eq("role_id", roleId);

  if (permissionCodes.length > 0) {
    const { data: perms } = await supabase.from("permissions").select("id, code").in("code", permissionCodes);
    if (perms && perms.length > 0) {
      const { error } = await supabase
        .from("role_permissions")
        .insert(perms.map((p) => ({ role_id: roleId, permission_id: p.id })));
      if (error) return { error: "Impossible de mettre à jour les permissions." };
    }
  }

  revalidatePath("/admin/roles");
  return { error: null };
}

export async function deleteRole(roleId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("roles").delete().eq("id", roleId);
  if (error) {
    return { error: "Impossible de supprimer ce rôle (les rôles système ne peuvent pas être supprimés)." };
  }
  revalidatePath("/admin/roles");
  return { error: null };
}
