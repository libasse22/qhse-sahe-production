"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validation/auth.schema";
import type { Profile } from "@/lib/types/auth";

export interface ActionResult {
  error: string | null;
}

export async function signUp(formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const supabase = await createClient();
  const { fullName, email, password } = parsed.data;
  const poste = formData.get("poste");
  const avatar = formData.get("avatar") as File | null;

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { error: traduireErreurSupabase(error.message) };
  }

  const userId = signUpData.user?.id;

  if (userId) {
    let avatarUrl: string | null = null;

    if (avatar && avatar.size > 0) {
      const path = `${userId}/${Date.now()}-${avatar.name}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatar, { contentType: avatar.type });
      if (!uploadError) {
        const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = publicUrl.publicUrl;
      }
    }

    await supabase
      .from("profiles")
      .update({
        poste: typeof poste === "string" && poste.trim() ? poste.trim() : null,
        avatar_url: avatarUrl,
      })
      .eq("id", userId);
  }

  redirect("/en-attente");
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: traduireErreurSupabase(error.message) };
  }

  revalidatePath("/", "layout");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role, status").eq("id", user.id).single()
    : { data: null };

  if (!profile || profile.status !== "active") {
    redirect("/en-attente");
  }

  const next = formData.get("next");
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    redirect(next);
  }

  redirect(profile.role === "employe" ? "/ouvrier/declarer" : "/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Récupère le profil complet de l'utilisateur connecté.
 * Retourne null si personne n'est authentifié.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role,
    status: data.status,
    roleId: data.role_id,
    poste: data.poste,
    avatarUrl: data.avatar_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function traduireErreurSupabase(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "E-mail ou mot de passe incorrect";
  }
  if (message.includes("User already registered")) {
    return "Un compte existe déjà avec cet e-mail";
  }
  if (message.includes("Password should be at least")) {
    return "Le mot de passe doit contenir au moins 8 caractères";
  }
  return message;
}

