// Service Worker QHSE Duo Sénégal — Offline & Web Push
const CACHE_NAME = "qhse-duo-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon.svg",
  "/icons/apple-touch-icon.png",
];

const CRITICAL_ROUTES = [
  "/",
  "/dashboard",
  "/ouvrier",
  "/ouvrier/declarer",
  "/incidents",
  "/actions",
  "/epi",
  "/permis-de-travail",
];

// Installation & Pre-caching
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([...STATIC_ASSETS, ...CRITICAL_ROUTES]).catch((err) => {
        console.warn("Certaines ressources n'ont pas pu être pré-cachées au SW:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activation & Nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de Caching : Network First pour HTML/Navigation, Stale-While-Revalidate pour static
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non GET ou d'extensions/API externes non-http
  if (request.method !== "GET" || !url.protocol.startsWith("http")) return;

  // Stratégie pour la navigation HTML (Network-First avec Fallback Cache)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          
          // Fallback sur la page d'accueil ou offline si indisponible
          return (await caches.match("/ouvrier")) || (await caches.match("/")) || new Response(
            "<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Hors ligne — QHSE Duo</title></head><body style='font-family:sans-serif;text-align:center;padding:50px;'><h1>Connexion Hors-Ligne</h1><p>L'application QHSE Duo est actuellement en mode hors-ligne. Vos données saisies sont conservées et seront synchronisées dès le retour du réseau.</p></body></html>",
            { headers: { "Content-Type": "text/html" } }
          );
        })
    );
    return;
  }

  // Stratégie Stale-While-Revalidate pour les assets statiques et images
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
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
          }
          return networkResponse;
        }).catch(() => null);

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

