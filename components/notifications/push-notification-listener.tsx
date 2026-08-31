"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function showNativePush(title: string, body: string, url: string) {
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    const payloadIcon = "/icons/icon-192x192.png";
    const payload = {
      type: "SHOW_NOTIFICATION",
      title,
      body,
      icon: payloadIcon,
      badge: payloadIcon,
      url,
      tag: `qhse-push-${Date.now()}`,
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          if (reg.active) {
            // Centralisation de l'affichage natif via postMessage au Service Worker
            reg.active.postMessage(payload);
          } else {
            reg.showNotification(title, {
              body,
              icon: payloadIcon,
              badge: payloadIcon,
              tag: payload.tag,
              data: { url },
              vibrate: [200, 100, 200],
            } as any);
          }
        })
        .catch(() => {
          try {
            new Notification(title, { body, icon: payloadIcon });
          } catch (e) {
            console.warn("Échec d'affichage de la notification native:", e);
          }
        });
    } else {
      try {
        new Notification(title, { body, icon: payloadIcon });
      } catch (e) {
        console.warn("Notification native non prise en charge:", e);
      }
    }
  }
}

export function PushNotificationListener() {
  useEffect(() => {
    const supabase = createClient();
    let channels: ReturnType<typeof supabase.channel>[] = [];

    function setupForUser(currentUserId: string) {
      // Nettoyer les anciens canaux s'il y en avait
      channels.forEach((ch) => supabase.removeChannel(ch));
      channels = [];

      // 1. Notifications individuelles (Triggers SQL sur table notifications)
      const notifCh = supabase
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
      channels.push(notifCh);

      // 2. Messages en temps réel (si pas l'expéditeur lui-même)
      const msgCh = supabase
        .channel(`push-messages-realtime-${currentUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const msg = payload.new as any;
            if (msg.sender_id === currentUserId) return;
            showNativePush(
              "📩 Nouveau message reçu",
              msg.content || "Nouveau message dans la discussion.",
              `/messagerie/${msg.conversation_id || ""}`
            );
          }
        )
        .subscribe();
      channels.push(msgCh);

      // 3. Incidents en temps réel
      const incCh = supabase
        .channel(`push-incidents-realtime-${currentUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "incidents" },
          (payload) => {
            const inc = payload.new as any;
            showNativePush(
              "🚨 Nouvel incident signalé",
              `Lieu : ${inc.location || "Non spécifié"}${inc.severity ? ` (Gravité : ${inc.severity})` : ""}`,
              `/incidents/${inc.id || ""}`
            );
          }
        )
        .subscribe();
      channels.push(incCh);

      // 4. Politiques QHSE (qhse_policies)
      const polCh = supabase
        .channel(`push-policies-realtime-${currentUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "qhse_policies" },
          (payload) => {
            const pol = payload.new as any;
            showNativePush(
              "📢 Nouvelle politique qualité publiée",
              `Titre : ${pol.title || "Politique générale"} (v${pol.version || 1})`,
              "/politique"
            );
          }
        )
        .subscribe();
      channels.push(polCh);

      // 5. Règlements intérieurs (internal_regulations)
      const regCh = supabase
        .channel(`push-regulations-realtime-${currentUserId}`)
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
      channels.push(regCh);
    }

    // Initialisation si utilisateur déjà connecté
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setupForUser(user.id);
    });

    // Écoute dynamique des changements d'état d'authentification (refresh/reconnexion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setupForUser(session.user.id);
      } else {
        channels.forEach((ch) => supabase.removeChannel(ch));
        channels = [];
      }
    });

    return () => {
      subscription.unsubscribe();
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, []);

  return null;
}


