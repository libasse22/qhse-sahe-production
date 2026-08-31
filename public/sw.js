// Service Worker QHSE Duo Sénégal — Offline & Web Push
const CACHE_NAME = "qhse-duo-v2";
const STATIC_ASSETS = [
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon.svg",
  "/icons/apple-touch-icon.png",
];

// Installation & Pre-caching des seuls assets statiques publics (jamais de routes dynamiques)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation & Nettoyage strict des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Stratégie de Caching : Network Only pour la navigation HTML (Sécurité Multi-Tenant), Stale-While-Revalidate pour static
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non GET ou non http(s)
  if (request.method !== "GET" || !url.protocol.startsWith("http")) return;

  // Stratégie pour la navigation HTML : Toujours du Réseau pour garantir zéro fuite multi-entreprises
  // Fallback sur page HTML générique minimale si offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          "<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Hors ligne — QHSE Duo</title><meta name='viewport' content='width=device-width, initial-scale=1'/></head><body style='font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#fff;'><h1>Mode Hors-Ligne</h1><p>L'application QHSE Duo est actuellement en mode hors-ligne. Vos signalements saisis sont conservés en toute sécurité dans l'appareil et seront envoyés dès le retour de la connexion Internet.</p></body></html>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      })
    );
    return;
  }

  // Stratégie Stale-While-Revalidate pour les assets statiques et images publics uniquement
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
            }
            return networkResponse;
          })
          .catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});

// Notifications Push Web (Événement Push Réseau)
self.addEventListener("push", (event) => {
  let data = {
    title: "🚨 Alerte QHSE Duo Sénégal",
    body: "Un nouvel événement ou signalement nécessite votre attention.",
    url: "/incidents",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || "Nouveau message ou publication",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/icon-192x192.png",
    vibrate: [200, 100, 200],
    tag: data.tag || `qhse-notif-${Date.now()}`,
    data: { url: data.url || "/incidents" },
    actions: [
      { action: "open", title: "Consulter" },
      { action: "close", title: "Fermer" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title || "Notification", options));
});

// Écouteur de messages postMessage envoyés par le client (Test Push & Realtime)
self.addEventListener("message", (event) => {
  if (event.data && (event.data.type === "SHOW_NOTIFICATION" || event.data.title)) {
    const data = event.data;
    const title = data.title || "Notification QHSE Duo";
    const options = {
      body: data.body || "Nouveau message ou publication",
      icon: data.icon || "/icons/icon-192x192.png",
      badge: data.badge || "/icons/icon-192x192.png",
      vibrate: [200, 100, 200],
      tag: data.tag || `qhse-postmsg-${Date.now()}`,
      data: { url: data.url || "/" },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Clic sur Notification Push
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

