"use server";

import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/services/auth.service";

// Configuration VAPID dynamique
function ensureVapidConfig(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@qhse-duo-senegal.sn";

  if (!publicKey || !privateKey) {
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return true;
  } catch {
    return false;
  }
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface ClientPushSubscription {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

/** Enregistre ou met à jour l'abonnement Web Push du périphérique de l'utilisateur. */
export async function subscribePushDevice(
  subscription: ClientPushSubscription,
  userAgent?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée. Veuillez vous reconnecter." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      company_id: profile?.company_id ?? null,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent || null,
      updated_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    return { error: "Impossible d'enregistrer les clés Web Push." };
  }

  return { error: null };
}

/** Supprime l'abonnement Web Push d'un périphérique spécifique. */
export async function unsubscribePushDevice(endpoint: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée." };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) return { error: "Échec de la désinscription." };
  return { error: null };
}

/** Indique si l'utilisateur courant possède au moins un abonnement Web Push actif. */
export async function getPushSubscriptionStatus(): Promise<{ isSubscribed: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { isSubscribed: false };

  const { count } = await supabase
    .from("push_subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return { isSubscribed: (count ?? 0) > 0 };
}

/**
 * Envoie une notification Web Push native (APNs / FCM) à tous les périphériques
 * enregistrés pour un utilisateur spécifique.
 * Opération totalement NON-BLOQUANTE : ne fait jamais échouer l'action métier principale.
 */
export async function sendWebPushToUser(
  userId: string,
  payload: {
    title: string;
    body: string;
    url: string;
    tag?: string;
  }
): Promise<void> {
  try {
    if (!ensureVapidConfig()) return;

    const supabase = await createClient();
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (!subscriptions || subscriptions.length === 0) return;

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag: payload.tag || `qhse-push-${Date.now()}`,
    });

    const expiredIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, pushPayload, {
            TTL: 86400,
            urgency: "high",
          });
        } catch (err: any) {
          // Si l'abonnement a expiré ou été révoqué par le navigateur (HTTP 404 ou 410)
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            expiredIds.push(sub.id);
          }
        }
      })
    );

    // Nettoyage automatique des abonnements expirés/invalides
    if (expiredIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredIds);
    }
  } catch (err) {
    console.warn("Avertissement : échec de l'envoi de la notification Web Push :", err);
  }
}

/**
 * Envoie une notification Web Push native à plusieurs utilisateurs simultanément.
 */
export async function sendWebPushToUsers(
  userIds: string[],
  payload: {
    title: string;
    body: string;
    url: string;
    tag?: string;
  }
): Promise<void> {
  if (!userIds || userIds.length === 0) return;
  const uniqueIds = Array.from(new Set(userIds));
  await Promise.all(uniqueIds.map((id) => sendWebPushToUser(id, payload)));
}

/**
 * Envoie une notification Web Push à tous les membres d'une entreprise (ou tous les membres actifs).
 */
export async function sendWebPushToCompany(
  companyId: string | null | undefined,
  payload: {
    title: string;
    body: string;
    url: string;
    tag?: string;
  },
  excludeUserId?: string
): Promise<void> {
  try {
    const supabase = await createClient();
    let query = supabase.from("profiles").select("id").eq("status", "active");

    if (companyId) {
      query = query.eq("company_id", companyId);
    }
    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }

    const { data: users } = await query;
    if (users && users.length > 0) {
      const userIds = users.map((u) => u.id);
      await sendWebPushToUsers(userIds, payload);
    }
  } catch (err) {
    console.warn("Erreur lors de l'envoi Web Push à l'entreprise :", err);
  }
}

