/**
 * Configuration VAPID centralisée pour Web Push PWA (Android, iOS & Desktop).
 * Inclut des clés VAPID de secours (fallback) pour garantir le fonctionnement
 * en production (Vercel, Netlify, etc.) même si les variables d'environnement
 * d'hôte ne sont pas définies.
 */

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BFMJaaM1QOqpcBpf-2Up94KuBmxrXOJM5qGR_0MN6AK8guWY5WgHEaD9WiWL0tAXjNI5t_-lB4m0Tv7wA7y96lM";

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "qgxFUGGan1IuG6AjQ5IHQT4kEJ2RYTKlybOW9HUiUeQ";

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:admin@qhse-duo-senegal.sn";
