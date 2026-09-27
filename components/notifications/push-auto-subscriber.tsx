"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribePushDevice } from "@/lib/services/web-push.service";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Composant de synchronisation automatique et silencieuse des jetons Web Push PWA.
 * S'assure que dès qu'un utilisateur autorise les notifications (ou est déjà autorisé),
 * son appareil est automatiquement enregistré dans Supabase (push_subscriptions).
 * Permet de recevoir les alertes en arrière-plan et lorsque l'application est fermée.
 */
export function PushAutoSubscriber() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    const supabase = createClient();

    async function syncSubscription() {
      try {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) return;

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
          });
        }

        const subJson = sub.toJSON();
        if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
          await subscribePushDevice(
            {
              endpoint: subJson.endpoint,
              keys: {
                p256dh: subJson.keys.p256dh,
                auth: subJson.keys.auth,
              },
            },
            navigator.userAgent
          );
        }
      } catch (err) {
        console.warn("Auto-synchronisation Web Push PWA non effectuée :", err);
      }
    }

    // Exécuter la synchronisation au démarrage si session active
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        void syncSubscription();
      }
    });

    // Écouter les connexions/reconnexions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
        void syncSubscription();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
