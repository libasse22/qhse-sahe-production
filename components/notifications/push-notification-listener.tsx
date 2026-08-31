"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function PushNotificationListener() {
  useEffect(() => {
    const supabase = createClient();

    async function setupRealtimeSubscriptions() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const currentUserId = user.id;

      // Realtime Listener pour les NOUVEAUX MESSAGES
      const messagesChannel = supabase
        .channel("push-messages-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const msg = payload.new as any;
            // Ne pas notifier si l'expéditeur est l'utilisateur courant lui-même
            if (msg.sender_id === currentUserId) return;

            showNativePush(
              "💬 Nouveau message dans la discussion",
              msg.content || "Nouveau message reçu.",
              `/messagerie/${msg.conversation_id || ""}`
            );
          }
        )
        .subscribe();

      // Realtime Listener pour les NOUVEAUX INCIDENTS
      const incidentsChannel = supabase
        .channel("push-incidents-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "incidents" },
          (payload) => {
            const inc = payload.new as any;

            showNativePush(
              "🚨 Nouvel incident signalé sur le terrain",
              `Lieu : ${inc.location || "Non spécifié"}${inc.severity ? ` (Gravité : ${inc.severity})` : ""}`,
              `/incidents/${inc.id || ""}`
            );
          }
        )
        .subscribe();

      // Realtime Listener pour les NOUVELLES POLITIQUES / RÈGLEMENTS
      const policiesChannel = supabase
        .channel("push-policies-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "internal_regulations" },
          (payload) => {
            const pol = payload.new as any;

            showNativePush(
              "📄 Nouveau Règlement Intérieur Publié",
              `Titre : ${pol.title || "Règlement général"} (v${pol.version || 1})`,
              "/reglement-interieur"
            );
          }
        )
        .subscribe();

      // Realtime Listener pour les NOTIFICATIONS INDIVIDUELLES (Triggers SQL)
      const notificationsChannel = supabase
        .channel(`push-user-notifications-${currentUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${currentUserId}` },
          (payload) => {
            const notif = payload.new as any;
            showNativePush(
              notif.title || "🔔 Notification QHSE Duo",
              notif.message || "Nouvel événement enregistré.",
              notif.link || "/dashboard"
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(incidentsChannel);
        supabase.removeChannel(policiesChannel);
        supabase.removeChannel(notificationsChannel);
      };
    }

    setupRealtimeSubscriptions();
  }, []);

  return null;
}

function showNativePush(title: string, body: string, url: string) {
  if (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof Notification !== "undefined" &&
    Notification.permission === "granted"
  ) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, {
        body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        data: { url },
        vibrate: [200, 100, 200],
      } as any);
    });
  }
}
